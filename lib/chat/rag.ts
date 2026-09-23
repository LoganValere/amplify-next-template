import { prisma } from "@/lib/db";
import { accountBalances } from "@/lib/budgets/balance";
import { buildUserPrompt, CHAT_SYSTEM_PROMPT } from "@/lib/chat/prompt";
import { getEnv } from "@/lib/env";

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
}

function score(query: string, text: string): number {
  const q = new Set(tokenize(query));
  const tokens = tokenize(text);
  let hits = 0;
  for (const token of tokens) {
    if (q.has(token)) hits += 1;
  }
  return hits;
}

export async function answerClientQuestion(clientId: string, question: string): Promise<{
  answer: string;
  citations: string[];
}> {
  const chunks = await prisma.contractChunk.findMany({
    where: { clientId },
    take: 200,
  });
  const ranked = [...chunks]
    .map((chunk) => ({ chunk, score: score(question, chunk.text) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  const excerpts = ranked.filter((row) => row.score > 0).map((row) => row.chunk.text.slice(0, 1200));
  const balances = await accountBalances(clientId);
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  const facts = [
    `Account: ${client?.name ?? ""}`,
    `Status: ${client?.status ?? ""}`,
    `Account manager: ${client?.accountManager ?? "Valere AM"}`,
    ...balances.map(
      (row) =>
        `${row.category.name}: ${row.balance.usedHours}h used, ${row.balance.remainingHours}h remaining (${row.balance.mode}${row.balance.nextRefillDate ? `, next refill ${row.balance.nextRefillDate}` : ""})`,
    ),
  ].join("\n");

  const env = getEnv();
  if (env.APP_BEDROCK_REGION) {
    try {
      const { BedrockRuntimeClient, InvokeModelCommand } = await import(
        "@aws-sdk/client-bedrock-runtime"
      );
      const bedrock = new BedrockRuntimeClient({ region: env.APP_BEDROCK_REGION });
      const body = {
        messages: [
          {
            role: "user",
            content: [{ text: `${CHAT_SYSTEM_PROMPT}\n\n${buildUserPrompt({ question, facts, excerpts })}` }],
          },
        ],
        inferenceConfig: { maxTokens: 400, temperature: 0.1 },
      };
      const response = await bedrock.send(
        new InvokeModelCommand({
          modelId: env.APP_BEDROCK_MODEL_ID,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(body),
        }),
      );
      const parsed = JSON.parse(new TextDecoder().decode(response.body)) as {
        output?: { message?: { content?: Array<{ text?: string }> } };
      };
      const text = parsed.output?.message?.content?.[0]?.text;
      if (text) {
        return { answer: text, citations: excerpts.slice(0, 2) };
      }
    } catch {
      // fall through to extractive answer
    }
  }

  if (excerpts.length === 0 && !question.toLowerCase().includes("hour")) {
    return {
      answer:
        "I do not have that in the portal documents. Please contact your Valere account manager rather than relying on an inferred answer.",
      citations: [],
    };
  }
  const relevantFacts = balances
    .map(
      (row) =>
        `${row.category.name}: ${row.balance.remainingHours}h remaining, ${row.balance.usedHours}h used.`,
    )
    .join(" ");
  const excerptNote = excerpts[0]
    ? ` Per indexed SOW text: “${excerpts[0].slice(0, 280)}…”`
    : "";
  return {
    answer: `Based on portal hour facts (not a legal opinion): ${relevantFacts}${excerptNote} If this is a contract interpretation beyond those facts, your Valere account manager should confirm.`,
    citations: excerpts.slice(0, 2),
  };
}

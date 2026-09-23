import { NextRequest, NextResponse } from "next/server";
import { requireUser, assertClientScope } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import { answerClientQuestion } from "@/lib/chat/rag";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db";

const windowMs = 60_000;
const hits = new Map<string, { count: number; start: number }>();

function rateLimit(key: string) {
  const now = Date.now();
  const current = hits.get(key);
  if (!current || now - current.start > windowMs) {
    hits.set(key, { count: 1, start: now });
    return;
  }
  current.count += 1;
  if (current.count > 20) {
    throw new AppError("Too many questions. Try again in a minute.", 429, "RATE_LIMIT");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { question: string; clientId?: string };
    const clientId = user.role === "CLIENT" ? user.clientId : body.clientId;
    if (!clientId) {
      throw new AppError("clientId is required");
    }
    assertClientScope(user, clientId);
    rateLimit(user.id);
    if (user.role !== "CLIENT" && user.role !== "ADMIN") {
      throw new AppError("Chat is available to clients and admins", 403, "FORBIDDEN");
    }
    const exists = await prisma.client.findUnique({ where: { id: clientId } });
    if (!exists) {
      throw new AppError("Account not found", 404, "NOT_FOUND");
    }
    const result = await answerClientQuestion(clientId, body.question ?? "");
    return NextResponse.json({
      answer: result.answer,
      citations: result.citations,
    });
  } catch (error) {
    return jsonError(error);
  }
}

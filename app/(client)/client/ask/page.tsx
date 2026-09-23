"use client";

import { FormEvent, useState } from "react";

export default function ClientAskPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<string[]>([]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const payload = (await response.json()) as { answer?: string; citations?: string[]; error?: string };
    setAnswer(payload.answer ?? payload.error ?? "");
    setCitations(payload.citations ?? []);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Ask about your engagement</h1>
      <p className="text-sm text-valere-muted">
        Answers are grounded in your connected SOW and portal hour facts. The assistant will not invent contract terms.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <textarea className="w-full min-h-28" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <button className="rounded-md bg-valere-fg text-white px-4 py-2 text-sm" type="submit">
          Ask
        </button>
      </form>
      {answer ? <p className="text-sm leading-6">{answer}</p> : null}
      {citations.map((citation, index) => (
        <p key={index} className="text-xs text-valere-muted border-l border-valere-border pl-3">
          {citation.slice(0, 400)}
        </p>
      ))}
    </div>
  );
}

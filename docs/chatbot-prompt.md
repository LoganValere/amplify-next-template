# Client chatbot prompt

The live prompt is `CHAT_SYSTEM_PROMPT` in `lib/chat/prompt.ts`.

Rules:

- Use only retrieved SOW excerpts and structured hour facts for that client.
- Do not invent clauses, dates, or remaining hours.
- Prefer Valere SOW practice on ambiguity (hours consumed as logged, change orders for out of scope, expired retainer hours are not a refund unless the text says so).
- Cite “per your SOW” only when an excerpt supports it.
- Do not mix category remaining hours unless asked for a total.

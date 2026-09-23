import { mondayErrorToCopy } from "@/lib/monday/wizard";
import type { MondayBoard, MondaySettings } from "./types";

type ErrorPayload = {
  error?: string;
  code?: string;
  missingColumnIds?: string[];
  retryAfterMs?: number;
};

export async function mondayRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw mondayErrorToCopy(payload as ErrorPayload);
  return payload;
}

export function readSettings(payload: Record<string, unknown>) {
  return payload as unknown as MondaySettings;
}

export function readBoards(payload: Record<string, unknown>) {
  return (payload.boards ?? []) as MondayBoard[];
}

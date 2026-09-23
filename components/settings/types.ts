export type Account = { id: string; name: string };
export type Category = { id: string; name: string; active: boolean };
export type User = {
  id: string;
  name: string;
  email: string;
  hourCategory: { name: string } | null;
};
export type Retainer = {
  id: string;
  hoursPerPeriod: number;
  replenishDayOfMonth: number;
  active: boolean;
  client: { name: string };
  hourCategory: { name: string };
};
export type KimaiRow = { id: string };

export type ApiErrorPayload = {
  error?: string;
  code?: string;
  missingColumnIds?: string[];
  retryAfterMs?: number;
};

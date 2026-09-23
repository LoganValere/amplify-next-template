import type { AccountHealthRecord } from "@/components/accounts/types";

export type ReportAccount = AccountHealthRecord;

export type HoursReportRow = {
  person: string;
  account: string;
  category: string;
  week: string;
  hours: number;
};

export type BurndownPoint = {
  date: string;
  remaining: number;
};

export type BurndownSeries = {
  points: BurndownPoint[];
  projectedZeroDate: string | null;
  velocityPerDay: number;
  /** Remaining hours at the close of the requested window, not live now. */
  remainingHours: number;
  asOf: string;
  mode: string;
  nextRefillDate: string | null;
};

export type ReportFilters = {
  from: string;
  to: string;
  clientId: string;
  categoryId: string;
};

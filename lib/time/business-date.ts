import { DEFAULT_TZ, zonedYmd } from "@/lib/retainers/period";

export const BUSINESS_TZ = DEFAULT_TZ;

/**
 * Current business date as a `yyyy-MM-dd` string in the business timezone.
 * Time entry dates are stored as plain date strings, so UTC slicing of an ISO
 * timestamp would shift the day for part of every evening.
 */
export function businessToday(now: Date = new Date()): string {
  return zonedYmd(now, BUSINESS_TZ);
}

/**
 * Shift a `yyyy-MM-dd` business date by whole days. Calendar arithmetic runs in
 * UTC so it never crosses a DST boundary mid-calculation.
 */
export function shiftBusinessDate(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid business date: ${ymd}`);
  }
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Inclusive trailing window ending today in the business timezone, e.g.
 * `businessDateRange(28)` covers today plus the previous 27 days.
 */
export function businessDateRange(trailingDays: number, now: Date = new Date()): { from: string; to: string } {
  if (!Number.isInteger(trailingDays) || trailingDays < 1) {
    throw new Error(`trailingDays must be a positive integer, received: ${trailingDays}`);
  }
  const to = businessToday(now);
  return { from: shiftBusinessDate(to, -(trailingDays - 1)), to };
}

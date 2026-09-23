import { asOfBounds, grantBusinessDate, type GrantEvent, type UsageEvent } from "@/lib/budgets/as-of";
import {
  retainerBalanceAsOf,
  type RetainerGrant,
  type RetainerTerms,
  type UsageIndex,
} from "@/lib/budgets/retainer-balance";
import { DEFAULT_TZ } from "@/lib/retainers/period";

export type BurndownDay = {
  date: string;
  grantedHours: number;
  usedHours: number;
};

export type BurndownPoint = {
  date: string;
  remaining: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function enumerateDays(from: string, to: string): string[] {
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Invalid burndown range: ${from}..${to}`);
  }
  const days: string[] = [];
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/**
 * Buckets grant and usage events onto the days of the selected window. Grants
 * take effect on their business date and anything after the window closes is
 * dropped, so a historical range never reflects later activity.
 */
export function burndownDays(
  from: string,
  to: string,
  grants: GrantEvent[],
  usage: UsageEvent[],
  timeZone: string = DEFAULT_TZ,
): BurndownDay[] {
  const { grantEffectiveBefore } = asOfBounds(to, timeZone);
  const grantedByDay = new Map<string, number>();
  for (const grant of grants) {
    if (grant.effectiveAt >= grantEffectiveBefore) continue;
    const day = grantBusinessDate(grant.effectiveAt, timeZone);
    grantedByDay.set(day, (grantedByDay.get(day) ?? 0) + grant.hours);
  }
  const usedByDay = new Map<string, number>();
  for (const entry of usage) {
    if (entry.date < from || entry.date > to) continue;
    usedByDay.set(entry.date, (usedByDay.get(entry.date) ?? 0) + entry.durationMinutes / 60);
  }
  return enumerateDays(from, to).map((date) => ({
    date,
    grantedHours: grantedByDay.get(date) ?? 0,
    usedHours: usedByDay.get(date) ?? 0,
  }));
}

/**
 * Builds a balance-over-time series that ends on the account's real remaining
 * hours. The opening balance is derived by reversing the window's grants and
 * usage out of that closing balance, so grants awarded before the window are
 * reflected instead of the series starting from an invented zero.
 */
export function buildBurndownPoints(days: BurndownDay[], endingRemainingHours: number): BurndownPoint[] {
  if (days.length === 0) return [];

  const netChange = days.reduce((sum, day) => sum + day.grantedHours - day.usedHours, 0);
  let running = endingRemainingHours - netChange;

  return days.map((day, index) => {
    running += day.grantedHours - day.usedHours;
    // Pin the final point to the authoritative balance so float drift cannot
    // make the chart disagree with the reported remaining hours.
    return { date: day.date, remaining: round2(index === days.length - 1 ? endingRemainingHours : running) };
  });
}

/**
 * Retainer series: each day is valued at its own period's balance rather than
 * by reversing the window's events out of the closing balance. A range that
 * crosses a replenishment therefore shows the pre-replenishment period as it
 * actually stood instead of inflating it by the next period's grant.
 */
export function retainerBurndownPoints(
  from: string,
  to: string,
  terms: RetainerTerms,
  grants: RetainerGrant[],
  usage: UsageIndex,
): BurndownPoint[] {
  return enumerateDays(from, to).map((date) => ({
    date,
    remaining: retainerBalanceAsOf(terms, grants, usage, date).remainingHours,
  }));
}

export function projectZeroDate(
  lastDay: string,
  remainingHours: number,
  velocityPerDay: number,
): string | null {
  if (velocityPerDay <= 0 || remainingHours <= 0) return null;
  const date = new Date(`${lastDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Math.ceil(remainingHours / velocityPerDay));
  return date.toISOString().slice(0, 10);
}

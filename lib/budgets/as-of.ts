import { fromZonedTime } from "date-fns-tz";
import { DEFAULT_TZ, zonedYmd } from "@/lib/retainers/period";

export type GrantEvent = { effectiveAt: Date; hours: number };
export type UsageEvent = { date: string; durationMinutes: number };

export type AsOfBounds = {
  /** Exclusive upper bound instant for `effectiveAt`. */
  grantEffectiveBefore: Date;
  /** Inclusive upper bound for plain `yyyy-MM-dd` entry dates. */
  entryDateAtMost: string;
};

function assertYmd(ymd: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new Error(`Invalid as-of date: ${ymd}`);
  }
}

/**
 * The instant at which the as-of day ends in the business timezone, i.e. the
 * start of the following day. Grants are timestamps while time entries are
 * plain business dates, so the timestamp side needs this boundary to avoid
 * counting a grant that lands the evening after the reporting window closes.
 */
export function asOfCutoff(asOfYmd: string, timeZone: string = DEFAULT_TZ): Date {
  assertYmd(asOfYmd);
  const nextDay = new Date(`${asOfYmd}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return fromZonedTime(`${nextDay.toISOString().slice(0, 10)}T00:00:00`, timeZone);
}

export function asOfBounds(asOfYmd: string, timeZone: string = DEFAULT_TZ): AsOfBounds {
  return { grantEffectiveBefore: asOfCutoff(asOfYmd, timeZone), entryDateAtMost: asOfYmd };
}

/** Business date a grant takes effect on, used to place it on the burndown. */
export function grantBusinessDate(effectiveAt: Date, timeZone: string = DEFAULT_TZ): string {
  return zonedYmd(effectiveAt, timeZone);
}

/**
 * Narrows a retainer period window so it never reports usage logged after the
 * as-of date, which keeps historical windows free of later activity.
 */
export function cappedUsageWindow(
  periodFrom: string,
  periodTo: string,
  asOfYmd: string,
): { from: string; to: string } {
  assertYmd(asOfYmd);
  return { from: periodFrom, to: asOfYmd < periodTo ? asOfYmd : periodTo };
}

/**
 * Event-sourced balance: every grant effective by the end of the as-of day
 * minus every hour logged on or before it. Later grants and later time entries
 * are excluded so a historical window cannot be contaminated by newer activity.
 */
export function netBalanceAsOf(
  grants: GrantEvent[],
  usage: UsageEvent[],
  asOfYmd: string,
  timeZone: string = DEFAULT_TZ,
): number {
  const { grantEffectiveBefore, entryDateAtMost } = asOfBounds(asOfYmd, timeZone);
  const granted = grants
    .filter((grant) => grant.effectiveAt < grantEffectiveBefore)
    .reduce((sum, grant) => sum + grant.hours, 0);
  const usedMinutes = usage
    .filter((entry) => entry.date <= entryDateAtMost)
    .reduce((sum, entry) => sum + entry.durationMinutes, 0);
  return Math.round((granted - usedMinutes / 60) * 100) / 100;
}

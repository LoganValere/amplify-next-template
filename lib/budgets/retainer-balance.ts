import { asOfCutoff, cappedUsageWindow, type UsageEvent } from "@/lib/budgets/as-of";
import { DEFAULT_TZ, monthRange, periodStartKey } from "@/lib/retainers/period";

/** The rollover terms that decide how much of a closed period survives. */
export type RetainerTerms = {
  rolloverPolicy: string;
  rolloverCapHours: number | null;
  timezone?: string | null;
};

export type RetainerGrant = {
  periodStart: string | null;
  hours: number;
  effectiveAt: Date;
};

export type RetainerBalance = {
  periodStart: string;
  /** Period grant plus any carry that survived the rollover policy. */
  grantedHours: number;
  usedHours: number;
  remainingHours: number;
};

export type UsageIndex = {
  /** Minutes logged on business dates inside the inclusive range. */
  minutesBetween(from: string, to: string): number;
};

const ACCUMULATE = "accumulate";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function minutesToHours(minutes: number): number {
  return round2(minutes / 60);
}

/** Calendar period (`yyyy-MM`) a business date falls in. */
export function periodKeyFor(ymd: string): string {
  const [year, month] = ymd.split("-");
  return periodStartKey(Number(year), Number(month) - 1);
}

function lowerBound(dates: string[], target: string): number {
  let low = 0;
  let high = dates.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (dates[mid] < target) low = mid + 1;
    else high = mid;
  }
  return low;
}

function upperBound(dates: string[], target: string): number {
  let low = 0;
  let high = dates.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (dates[mid] <= target) low = mid + 1;
    else high = mid;
  }
  return low;
}

/**
 * Prefix-sums usage by business date so a whole series can be evaluated from a
 * single usage read instead of one aggregate per day and per closed period.
 */
export function indexUsage(usage: UsageEvent[]): UsageIndex {
  const byDate = new Map<string, number>();
  for (const entry of usage) {
    byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + entry.durationMinutes);
  }
  const dates = [...byDate.keys()].sort();
  const running = new Array<number>(dates.length + 1).fill(0);
  dates.forEach((date, index) => {
    running[index + 1] = running[index] + (byDate.get(date) ?? 0);
  });
  return {
    minutesBetween(from: string, to: string): number {
      if (to < from) return 0;
      return running[upperBound(dates, to)] - running[lowerBound(dates, from)];
    },
  };
}

/**
 * Unused hours carried into `periodStart`. Each closed period is settled in
 * order and can never contribute a negative carry, then the cap is applied to
 * the total the same way a single as-of balance applies it.
 */
function carriedInto(
  terms: RetainerTerms,
  grants: RetainerGrant[],
  usage: UsageIndex,
  periodStart: string,
): number {
  if (terms.rolloverPolicy !== ACCUMULATE) return 0;
  const prior = grants
    .filter((grant): grant is RetainerGrant & { periodStart: string } =>
      grant.periodStart != null && grant.periodStart < periodStart,
    )
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  let carry = 0;
  for (const grant of prior) {
    const period = monthRange(grant.periodStart);
    const used = minutesToHours(usage.minutesBetween(period.from, period.to));
    carry = Math.max(0, carry + grant.hours - used);
  }
  const carried = round2(carry);
  return terms.rolloverCapHours != null ? Math.min(carried, terms.rolloverCapHours) : carried;
}

/**
 * Retainer balance at the end of a business date: the grant for that date's own
 * period, plus surviving carry, less the period's usage up to that date. Every
 * day is evaluated against its own period, so a range spanning a replenishment
 * reports each side of the boundary truthfully instead of reversing later
 * events out of the closing balance.
 */
export function retainerBalanceAsOf(
  terms: RetainerTerms,
  grants: RetainerGrant[],
  usage: UsageIndex,
  asOf: string,
  options: { enforceCutoff?: boolean } = {},
): RetainerBalance {
  const enforceCutoff = options.enforceCutoff ?? true;
  const timeZone = terms.timezone || DEFAULT_TZ;
  const periodStart = periodKeyFor(asOf);
  const period = monthRange(periodStart);
  const cutoff = enforceCutoff ? asOfCutoff(asOf, timeZone) : null;
  const effective = cutoff ? grants.filter((grant) => grant.effectiveAt < cutoff) : grants;
  const grantHours = effective.find((grant) => grant.periodStart === periodStart)?.hours ?? 0;
  const carried = carriedInto(terms, effective, usage, periodStart);
  const window = enforceCutoff ? cappedUsageWindow(period.from, period.to, asOf) : period;
  const usedHours = minutesToHours(usage.minutesBetween(window.from, window.to));
  const grantedHours = grantHours + carried;
  return {
    periodStart,
    grantedHours,
    usedHours,
    remainingHours: round2(grantedHours - usedHours),
  };
}

/**
 * Earliest business date whose usage can still affect the balance on `asOf`.
 * Under `expire` only the current period matters; accumulated rollover has to
 * settle every earlier granted period to know what carried forward.
 */
export function usageStartFor(
  terms: RetainerTerms,
  grants: RetainerGrant[],
  asOf: string,
): string {
  const periodStart = periodKeyFor(asOf);
  const period = monthRange(periodStart);
  if (terms.rolloverPolicy !== ACCUMULATE) return period.from;
  const earlier = grants
    .map((grant) => grant.periodStart)
    .filter((start): start is string => start != null && start < periodStart)
    .sort();
  return earlier.length > 0 ? monthRange(earlier[0]).from : period.from;
}

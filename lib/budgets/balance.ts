import { prisma } from "@/lib/db";
import { monthRange, zonedYmd, DEFAULT_TZ } from "@/lib/retainers/period";
import { asOfBounds, cappedUsageWindow } from "@/lib/budgets/as-of";
import {
  indexUsage,
  periodKeyFor,
  retainerBalanceAsOf,
  usageStartFor,
} from "@/lib/budgets/retainer-balance";
import { loadUsageByDate } from "@/lib/budgets/usage";

export type BucketBalance = {
  clientId: string;
  hourCategoryId: string;
  mode: "retainer" | "prepaid";
  remainingHours: number;
  grantedHours: number;
  usedHours: number;
  nextRefillDate: string | null;
  periodStart: string | null;
  /** Business date the balance was evaluated on. */
  asOf: string;
};

type ActiveRetainer = Awaited<ReturnType<typeof findActiveRetainer>>;

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export function findActiveRetainer(clientId: string, hourCategoryId: string) {
  return prisma.retainer.findFirst({ where: { clientId, hourCategoryId, active: true } });
}

/**
 * Balance at the end of a business date. Grants count once they are effective
 * and time entries count once their business date has arrived, so a historical
 * window never picks up later grants or later logged time.
 */
export async function categoryBalanceAsOf(
  clientId: string,
  hourCategoryId: string,
  asOf: string,
): Promise<BucketBalance> {
  const retainer = await findActiveRetainer(clientId, hourCategoryId);
  return balanceFor(clientId, hourCategoryId, asOf, retainer, true);
}

export async function categoryBalance(
  clientId: string,
  hourCategoryId: string,
  now = new Date(),
): Promise<BucketBalance> {
  const retainer = await findActiveRetainer(clientId, hourCategoryId);
  const asOf = zonedYmd(now, retainer?.timezone || DEFAULT_TZ);
  // The live balance stays deliberately conservative: anything already
  // recorded counts against the bucket, including future-dated entries, so the
  // overdraw guard cannot be sidestepped by logging ahead.
  return balanceFor(clientId, hourCategoryId, asOf, retainer, false);
}

async function balanceFor(
  clientId: string,
  hourCategoryId: string,
  asOf: string,
  retainer: ActiveRetainer,
  enforceCutoff: boolean,
): Promise<BucketBalance> {
  const timeZone = retainer?.timezone || DEFAULT_TZ;
  const { grantEffectiveBefore, entryDateAtMost } = asOfBounds(asOf, timeZone);
  const effectiveAtFilter = enforceCutoff ? { effectiveAt: { lt: grantEffectiveBefore } } : {};

  if (retainer) {
    const periodStart = periodKeyFor(asOf);
    const period = monthRange(periodStart);
    const usageWindow = enforceCutoff ? cappedUsageWindow(period.from, period.to, asOf) : period;
    // Every period up to the as-of one, so accumulated rollover can settle the
    // closed periods without an aggregate per period.
    const grants = await prisma.budgetGrant.findMany({
      where: { retainerId: retainer.id, periodStart: { lte: periodStart }, ...effectiveAtFilter },
    });
    const usage = indexUsage(
      await loadUsageByDate(
        clientId,
        hourCategoryId,
        usageStartFor(retainer, grants, asOf),
        usageWindow.to,
      ),
    );
    const balance = retainerBalanceAsOf(retainer, grants, usage, asOf, { enforceCutoff });
    return {
      clientId,
      hourCategoryId,
      mode: "retainer",
      remainingHours: balance.remainingHours,
      grantedHours: balance.grantedHours,
      usedHours: balance.usedHours,
      nextRefillDate: nextRefill(asOf, retainer.replenishDayOfMonth),
      periodStart,
      asOf,
    };
  }

  const grants = await prisma.budgetGrant.aggregate({
    where: {
      clientId,
      hourCategoryId,
      type: { in: ["initial", "replenish"] },
      ...effectiveAtFilter,
    },
    _sum: { hours: true },
  });
  const used = await prisma.timeEntry.aggregate({
    where: {
      clientId,
      hourCategoryId,
      ...(enforceCutoff ? { date: { lte: entryDateAtMost } } : {}),
    },
    _sum: { durationMinutes: true },
  });
  const grantedHours = grants._sum.hours ?? 0;
  const usedHours = minutesToHours(used._sum.durationMinutes ?? 0);
  return {
    clientId,
    hourCategoryId,
    mode: "prepaid",
    remainingHours: Math.round((grantedHours - usedHours) * 100) / 100,
    grantedHours,
    usedHours,
    nextRefillDate: null,
    periodStart: null,
    asOf,
  };
}

function nextRefill(todayYmd: string, dayOfMonth: number): string {
  const [yearStr, monthStr, dayStr] = todayYmd.split("-");
  let year = Number(yearStr);
  let monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);
  const lastThis = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const effective = Math.min(dayOfMonth, lastThis);
  if (day < effective) {
    return `${yearStr}-${monthStr}-${String(effective).padStart(2, "0")}`;
  }
  monthIndex += 1;
  if (monthIndex > 11) {
    monthIndex = 0;
    year += 1;
  }
  const lastNext = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const nextDay = Math.min(dayOfMonth, lastNext);
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
}

export async function accountBalances(clientId: string) {
  const categories = await prisma.hourCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return Promise.all(
    categories.map(async (category) => ({
      category,
      balance: await categoryBalance(clientId, category.id),
    })),
  );
}

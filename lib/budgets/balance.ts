import { prisma } from "@/lib/db";
import { monthRange, periodStartKey, zonedYmd, DEFAULT_TZ } from "@/lib/retainers/period";

export type BucketBalance = {
  clientId: string;
  hourCategoryId: string;
  mode: "retainer" | "prepaid";
  remainingHours: number;
  grantedHours: number;
  usedHours: number;
  nextRefillDate: string | null;
  periodStart: string | null;
};

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export async function categoryBalance(
  clientId: string,
  hourCategoryId: string,
  now = new Date(),
): Promise<BucketBalance> {
  const retainer = await prisma.retainer.findFirst({
    where: { clientId, hourCategoryId, active: true },
  });

  if (retainer) {
    const ymd = zonedYmd(now, retainer.timezone || DEFAULT_TZ);
    const [yearStr, monthStr] = ymd.split("-");
    const periodStart = periodStartKey(Number(yearStr), Number(monthStr) - 1);
    const { from, to } = monthRange(periodStart);
    const grant = await prisma.budgetGrant.findFirst({
      where: { retainerId: retainer.id, periodStart },
    });
    const grantHours = grant?.hours ?? 0;
    const used = await prisma.timeEntry.aggregate({
      where: {
        clientId,
        hourCategoryId,
        date: { gte: from, lte: to },
      },
      _sum: { durationMinutes: true },
    });
    const usedHours = minutesToHours(used._sum.durationMinutes ?? 0);
    let carried = 0;
    if (retainer.rolloverPolicy === "accumulate") {
      carried = await accumulatedUnused(retainer.id, retainer.clientId, hourCategoryId, periodStart);
      if (retainer.rolloverCapHours != null) {
        carried = Math.min(carried, retainer.rolloverCapHours);
      }
    }
    const remainingHours = Math.round((grantHours + carried - usedHours) * 100) / 100;
    return {
      clientId,
      hourCategoryId,
      mode: "retainer",
      remainingHours,
      grantedHours: grantHours + carried,
      usedHours,
      nextRefillDate: nextRefill(ymd, retainer.replenishDayOfMonth),
      periodStart,
    };
  }

  const grants = await prisma.budgetGrant.aggregate({
    where: {
      clientId,
      hourCategoryId,
      type: { in: ["initial", "replenish"] },
    },
    _sum: { hours: true },
  });
  const used = await prisma.timeEntry.aggregate({
    where: { clientId, hourCategoryId },
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
  };
}

async function accumulatedUnused(
  retainerId: string,
  clientId: string,
  hourCategoryId: string,
  beforePeriod: string,
): Promise<number> {
  const grants = await prisma.budgetGrant.findMany({
    where: { retainerId, periodStart: { not: null, lt: beforePeriod } },
    orderBy: { periodStart: "asc" },
  });
  let carry = 0;
  for (const grant of grants) {
    if (!grant.periodStart) continue;
    const { from, to } = monthRange(grant.periodStart);
    const used = await prisma.timeEntry.aggregate({
      where: { clientId, hourCategoryId, date: { gte: from, lte: to } },
      _sum: { durationMinutes: true },
    });
    const usedHours = minutesToHours(used._sum.durationMinutes ?? 0);
    carry = Math.max(0, carry + grant.hours - usedHours);
  }
  return Math.round(carry * 100) / 100;
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

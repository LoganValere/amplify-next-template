import { prisma } from "@/lib/db";
import { categoryBalanceAsOf, findActiveRetainer } from "@/lib/budgets/balance";
import { asOfBounds } from "@/lib/budgets/as-of";
import {
  indexUsage,
  periodKeyFor,
  usageStartFor,
  type UsageIndex,
} from "@/lib/budgets/retainer-balance";
import { loadUsageByDate } from "@/lib/budgets/usage";
import { DEFAULT_TZ, monthRange } from "@/lib/retainers/period";
import {
  buildBurndownPoints,
  burndownDays,
  projectZeroDate,
  retainerBurndownPoints,
  type BurndownPoint,
} from "@/lib/reports/burndown";
import { shiftBusinessDate } from "@/lib/time/business-date";

export async function hoursReport(filters: {
  from: string;
  to: string;
  clientId?: string;
  userId?: string;
  hourCategoryId?: string;
}) {
  const entries = await prisma.timeEntry.findMany({
    where: {
      date: { gte: filters.from, lte: filters.to },
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.hourCategoryId ? { hourCategoryId: filters.hourCategoryId } : {}),
    },
    include: { user: { select: { id: true, name: true, email: true } }, client: true, hourCategory: true },
  });
  const groups = new Map<
    string,
    { person: string; account: string; category: string; week: string; hours: number }
  >();
  for (const entry of entries) {
    const week = entry.date.slice(0, 8) + weekOf(entry.date);
    const key = `${entry.userId}|${entry.clientId}|${entry.hourCategoryId}|${week}`;
    const hours = entry.durationMinutes / 60;
    const current = groups.get(key);
    if (current) {
      current.hours += hours;
    } else {
      groups.set(key, {
        person: entry.user.name,
        account: entry.client.name,
        category: entry.hourCategory.name,
        week,
        hours,
      });
    }
  }
  return [...groups.values()].map((row) => ({
    ...row,
    hours: Math.round(row.hours * 100) / 100,
  }));
}

function weekOf(ymd: string): string {
  const date = new Date(`${ymd}T00:00:00Z`);
  const onejan = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7);
  return String(week).padStart(2, "0");
}

function maxDate(left: string, right: string): string {
  return left > right ? left : right;
}

export async function burndownSeries(clientId: string, hourCategoryId: string, from: string, to: string) {
  const retainer = await findActiveRetainer(clientId, hourCategoryId);
  const timeZone = retainer?.timezone || DEFAULT_TZ;
  const { grantEffectiveBefore } = asOfBounds(to, timeZone);
  // Anchor the series to the balance at the close of the window rather than
  // the live balance, so a historical range is not pulled to today's number.
  const latest = await categoryBalanceAsOf(clientId, hourCategoryId, to);

  let points: BurndownPoint[];
  let usage: UsageIndex;
  if (retainer) {
    const grants = await prisma.budgetGrant.findMany({
      where: {
        retainerId: retainer.id,
        periodStart: { lte: periodKeyFor(to) },
        effectiveAt: { lt: grantEffectiveBefore },
      },
    });
    // Closed periods before the window still decide what carried into it, so
    // the usage read reaches back as far as the rollover policy needs.
    usage = indexUsage(
      await loadUsageByDate(clientId, hourCategoryId, usageStartFor(retainer, grants, from), to),
    );
    points = retainerBurndownPoints(from, to, retainer, grants, usage);
  } else {
    const entries = await loadUsageByDate(clientId, hourCategoryId, from, to);
    const grants = await prisma.budgetGrant.findMany({
      where: { clientId, hourCategoryId, effectiveAt: { lt: grantEffectiveBefore } },
      orderBy: { effectiveAt: "asc" },
    });
    usage = indexUsage(entries);
    points = buildBurndownPoints(
      burndownDays(from, to, grants, entries, timeZone),
      latest.remainingHours,
    );
  }

  const trailingFrom = maxDate(from, shiftBusinessDate(to, -28));
  const velocity = Math.round((usage.minutesBetween(trailingFrom, to) / 60 / 28) * 100) / 100;
  return {
    points,
    velocityPerDay: velocity,
    projectedZeroDate: projectZeroDate(to, latest.remainingHours, velocity),
    remainingHours: latest.remainingHours,
    asOf: latest.asOf,
    mode: latest.mode,
    nextRefillDate: latest.nextRefillDate,
    period: latest.periodStart ? monthRange(latest.periodStart) : null,
  };
}

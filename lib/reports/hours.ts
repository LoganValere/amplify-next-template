import { prisma } from "@/lib/db";
import { categoryBalance } from "@/lib/budgets/balance";
import { monthRange } from "@/lib/retainers/period";

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

export async function burndownSeries(clientId: string, hourCategoryId: string, from: string, to: string) {
  const entries = await prisma.timeEntry.findMany({
    where: { clientId, hourCategoryId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });
  const grants = await prisma.budgetGrant.findMany({
    where: { clientId, hourCategoryId },
    orderBy: { effectiveAt: "asc" },
  });
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const usedByDay = new Map<string, number>();
  for (const entry of entries) {
    usedByDay.set(entry.date, (usedByDay.get(entry.date) ?? 0) + entry.durationMinutes / 60);
  }
  let remaining = 0;
  const points: Array<{ date: string; remaining: number }> = [];
  for (const day of days) {
    for (const grant of grants) {
      const effective = grant.effectiveAt.toISOString().slice(0, 10);
      if (effective === day) {
        remaining += grant.hours;
      }
    }
    remaining -= usedByDay.get(day) ?? 0;
    points.push({ date: day, remaining: Math.round(remaining * 100) / 100 });
  }
  const trailing = entries.filter((entry) => entry.date >= addDays(to, -28) && entry.date <= to);
  const trailingHours = trailing.reduce((sum, entry) => sum + entry.durationMinutes / 60, 0);
  const velocity = trailingHours / 28;
  const latest = await categoryBalance(clientId, hourCategoryId);
  let projectedZero: string | null = null;
  if (velocity > 0 && latest.remainingHours > 0) {
    const daysLeft = latest.remainingHours / velocity;
    projectedZero = addDays(to, Math.ceil(daysLeft));
  }
  return {
    points,
    velocityPerDay: Math.round(velocity * 100) / 100,
    projectedZeroDate: velocity === 0 ? null : projectedZero,
    remainingHours: latest.remainingHours,
    mode: latest.mode,
    nextRefillDate: latest.nextRefillDate,
    period: latest.periodStart ? monthRange(latest.periodStart) : null,
  };
}

function addDays(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

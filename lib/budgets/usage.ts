import { prisma } from "@/lib/db";
import type { UsageEvent } from "@/lib/budgets/as-of";

/**
 * Daily usage totals for a client's category. Grouping in the database keeps
 * one read per balance or series instead of an aggregate per day or period.
 */
export async function loadUsageByDate(
  clientId: string,
  hourCategoryId: string,
  from: string,
  to: string,
): Promise<UsageEvent[]> {
  if (to < from) return [];
  const rows = await prisma.timeEntry.groupBy({
    by: ["date"],
    where: { clientId, hourCategoryId, date: { gte: from, lte: to } },
    _sum: { durationMinutes: true },
  });
  return rows.map((row) => ({ date: row.date, durationMinutes: row._sum.durationMinutes ?? 0 }));
}

import { prisma } from "@/lib/db";
import { isReplenishDay } from "@/lib/retainers/period";

export async function runRetainerReplenish(now = new Date()): Promise<number> {
  const retainers = await prisma.retainer.findMany({ where: { active: true } });
  let created = 0;
  for (const retainer of retainers) {
    const today = isReplenishDay(now, retainer.replenishDayOfMonth, retainer.timezone);
    if (!today.due) {
      continue;
    }
    const todayYmd = `${today.year}-${String(today.monthIndex + 1).padStart(2, "0")}-${String(
      Math.min(
        retainer.replenishDayOfMonth,
        new Date(Date.UTC(today.year, today.monthIndex + 1, 0)).getUTCDate(),
      ),
    ).padStart(2, "0")}`;
    if (retainer.startDate > todayYmd) {
      continue;
    }
    if (retainer.endDate && retainer.endDate < todayYmd) {
      continue;
    }
    try {
      await prisma.budgetGrant.create({
        data: {
          clientId: retainer.clientId,
          hourCategoryId: retainer.hourCategoryId,
          hours: retainer.hoursPerPeriod,
          type: "retainer",
          note: `Monthly retainer ${today.periodStart}`,
          retainerId: retainer.id,
          periodStart: today.periodStart,
        },
      });
      created += 1;
    } catch {
      // unique (retainerId, periodStart) — already granted this period
    }
  }
  return created;
}

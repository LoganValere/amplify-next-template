import { prisma } from "@/lib/db";
import { fetchMondayAccounts } from "@/lib/monday/client";

export async function syncMondayAccounts(): Promise<{ upserted: number }> {
  const items = await fetchMondayAccounts();
  for (const item of items) {
    const trackable = item.status !== "Dead" && item.status !== "Completed";
    await prisma.client.upsert({
      where: { mondayItemId: item.id },
      create: {
        mondayItemId: item.id,
        name: item.name,
        clientLabel: item.clientLabel || null,
        status: item.status,
        trackable,
        office: item.office || null,
        projectManager: item.projectManager || null,
        accountManager: item.accountManager || null,
        projectedEnd: item.projectedEnd ? new Date(item.projectedEnd) : null,
        archived: !trackable,
      },
      update: {
        name: item.name,
        clientLabel: item.clientLabel || null,
        status: item.status,
        trackable,
        office: item.office || null,
        projectManager: item.projectManager || null,
        accountManager: item.accountManager || null,
        projectedEnd: item.projectedEnd ? new Date(item.projectedEnd) : null,
        archived: !trackable,
      },
    });
  }
  await prisma.mondaySyncState.upsert({
    where: { boardId: process.env.APP_MONDAY_ACCOUNTS_BOARD_ID ?? "4476095209" },
    create: {
      boardId: process.env.APP_MONDAY_ACCOUNTS_BOARD_ID ?? "4476095209",
      lastRunAt: new Date(),
    },
    update: { lastRunAt: new Date() },
  });
  return { upserted: items.length };
}

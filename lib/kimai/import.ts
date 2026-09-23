import { prisma } from "@/lib/db";
import { parseKimaiCsv } from "@/lib/kimai/parse";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export async function stageKimaiCsv(text: string): Promise<{ batchId: string; pending: number; imported: number }> {
  const rows = parseKimaiCsv(text);
  const batchId = `kimai-${Date.now()}`;
  const clients = await prisma.client.findMany();
  const categories = await prisma.hourCategory.findMany();
  const general = categories.find((category) => category.slug === "general");
  let imported = 0;
  let pending = 0;
  for (const row of rows) {
    const existing = await prisma.timeEntry.findUnique({ where: { kimaiHash: row.hash } });
    if (existing) {
      continue;
    }
    const client = clients.find(
      (item) =>
        normalize(item.name) === normalize(row.customer) ||
        normalize(item.name) === normalize(row.project) ||
        normalize(item.clientLabel ?? "") === normalize(row.customer),
    );
    const category =
      categories.find((item) => normalize(item.name) === normalize(row.activity)) ?? general;
    if (!client || !category) {
      await prisma.kimaiImportRow.create({
        data: {
          batchId,
          raw: JSON.stringify(row),
          status: "unmatched",
          customer: row.customer,
          project: row.project,
          email: row.email,
          activity: row.activity,
          date: row.date,
          fromTime: row.fromTime,
          toTime: row.toTime,
          durationSeconds: row.durationSeconds,
          description: row.description,
          suggestedClientId: client?.id,
        },
      });
      pending += 1;
      continue;
    }
    let user = await prisma.user.findUnique({ where: { email: row.email } });
    if (!user && row.email) {
      user = await prisma.user.create({
        data: {
          email: row.email,
          name: row.user || row.email,
          role: "STAFF",
          hourCategoryId: category.id,
        },
      });
    }
    if (!user) {
      await prisma.kimaiImportRow.create({
        data: {
          batchId,
          raw: JSON.stringify(row),
          status: "unmatched",
          customer: row.customer,
          project: row.project,
          email: row.email,
          activity: row.activity,
          date: row.date,
          fromTime: row.fromTime,
          toTime: row.toTime,
          durationSeconds: row.durationSeconds,
          description: row.description,
        },
      });
      pending += 1;
      continue;
    }
    await prisma.timeEntry.create({
      data: {
        userId: user.id,
        clientId: client.id,
        hourCategoryId: category.id,
        date: row.date,
        startTime: row.fromTime.slice(0, 5),
        endTime: row.toTime.slice(0, 5),
        durationMinutes: Math.max(1, Math.round(row.durationSeconds / 60)),
        description: row.description,
        source: "kimai",
        kimaiHash: row.hash,
      },
    });
    imported += 1;
  }
  return { batchId, pending, imported };
}

export async function applyKimaiRow(rowId: string, clientId: string, hourCategoryId: string) {
  const row = await prisma.kimaiImportRow.findUnique({ where: { id: rowId } });
  if (!row || row.status !== "unmatched") {
    throw new Error("Row is not unmatched");
  }
  const parsed = JSON.parse(row.raw) as { hash: string; email: string; user: string };
  let user = await prisma.user.findUnique({ where: { email: row.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: row.email || `unknown-${row.id}@valere.io`,
        name: parsed.user || row.email,
        role: "STAFF",
        hourCategoryId,
      },
    });
  }
  await prisma.timeEntry.create({
    data: {
      userId: user.id,
      clientId,
      hourCategoryId,
      date: row.date,
      startTime: row.fromTime.slice(0, 5),
      endTime: row.toTime.slice(0, 5),
      durationMinutes: Math.max(1, Math.round(row.durationSeconds / 60)),
      description: row.description,
      source: "kimai",
      kimaiHash: parsed.hash,
    },
  });
  await prisma.kimaiImportRow.update({
    where: { id: rowId },
    data: { status: "imported", suggestedClientId: clientId },
  });
}

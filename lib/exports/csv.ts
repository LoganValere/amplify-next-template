import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/errors";

export type ExportFilters = {
  from: string;
  to: string;
  clientId?: string;
  userId?: string;
};

export async function loadExportRows(actor: SessionUser, filters: ExportFilters) {
  if (actor.role === "CLIENT") {
    if (!actor.clientId) {
      throw new ForbiddenError();
    }
    filters.clientId = actor.clientId;
  }
  if (actor.role === "STAFF") {
    filters.userId = actor.id;
  }
  const rows = await prisma.timeEntry.findMany({
    where: {
      date: { gte: filters.from, lte: filters.to },
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
    },
    include: { user: { select: { id: true, name: true, email: true } }, client: true, hourCategory: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return rows.map((row) => ({
    date: row.date,
    start: row.startTime ?? "",
    end: row.endTime ?? "",
    durationHours: Math.round((row.durationMinutes / 60) * 100) / 100,
    person: row.user.name,
    account: row.client.name,
    category: row.hourCategory.name,
    notes: row.description,
    source: row.source,
  }));
}

export function toCsv(rows: Awaited<ReturnType<typeof loadExportRows>>): string {
  const header = [
    "date",
    "start",
    "end",
    "duration_hours",
    "person",
    "account",
    "category",
    "notes",
    "source",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    const values = [
      row.date,
      row.start,
      row.end,
      String(row.durationHours),
      row.person,
      row.account,
      row.category,
      row.notes,
      row.source,
    ].map((value) => `"${value.replaceAll('"', '""')}"`);
    lines.push(values.join(","));
  }
  return lines.join("\n");
}

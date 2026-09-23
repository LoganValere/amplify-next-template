import { prisma } from "@/lib/db";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth/session";
import { categoryBalance } from "@/lib/budgets/balance";

export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

export async function createManualEntry(input: {
  actor: SessionUser;
  userId: string;
  clientId: string;
  hourCategoryId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  description: string;
  allowOverage: boolean;
}) {
  if (input.actor.role === "STAFF" && input.actor.id !== input.userId) {
    throw new ForbiddenError("Staff can only log their own time");
  }
  if (input.durationMinutes <= 0) {
    throw new AppError("Duration must be greater than zero");
  }
  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client || !client.trackable || client.archived) {
    throw new AppError("Account is not available for time tracking");
  }
  const balance = await categoryBalance(input.clientId, input.hourCategoryId);
  const nextRemaining = balance.remainingHours - input.durationMinutes / 60;
  if (nextRemaining < 0 && !input.allowOverage) {
    throw new AppError(
      `This entry would overdraw the ${balance.mode} bucket (${balance.remainingHours.toFixed(2)}h remaining). Admins can allow overage.`,
      409,
      "OVERDRAW",
    );
  }
  return prisma.timeEntry.create({
    data: {
      userId: input.userId,
      clientId: input.clientId,
      hourCategoryId: input.hourCategoryId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes: input.durationMinutes,
      description: input.description,
      source: "manual",
    },
    include: { client: true, hourCategory: true, user: { select: { id: true, name: true, email: true } } },
  });
}

export async function updateEntry(
  actor: SessionUser,
  entryId: string,
  patch: Partial<{
    date: string;
    startTime: string | null;
    endTime: string | null;
    durationMinutes: number;
    description: string;
    hourCategoryId: string;
  }>,
) {
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry) {
    throw new NotFoundError("Time entry not found");
  }
  if (actor.role === "STAFF" && actor.id !== entry.userId) {
    throw new ForbiddenError("Staff can only edit their own entries");
  }
  if (actor.role === "CLIENT") {
    throw new ForbiddenError();
  }
  await prisma.timeEntryRevision.create({
    data: {
      timeEntryId: entry.id,
      actorId: actor.id,
      previousJson: JSON.stringify(entry),
    },
  });
  return prisma.timeEntry.update({
    where: { id: entryId },
    data: patch,
  });
}

export async function deleteEntry(actor: SessionUser, entryId: string) {
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry) {
    throw new NotFoundError("Time entry not found");
  }
  if (actor.role === "STAFF" && actor.id !== entry.userId) {
    throw new ForbiddenError("Staff can only delete their own entries");
  }
  if (actor.role === "CLIENT") {
    throw new ForbiddenError();
  }
  await prisma.timeEntryRevision.create({
    data: {
      timeEntryId: entry.id,
      actorId: actor.id,
      previousJson: JSON.stringify(entry),
    },
  });
  await prisma.timeEntry.delete({ where: { id: entryId } });
}

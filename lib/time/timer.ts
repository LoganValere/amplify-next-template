import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth/session";
import { splitTimerRange } from "@/lib/time/split";

export async function startTimer(actor: SessionUser, clientId: string, note: string) {
  if (!actor.hourCategoryId) {
    throw new AppError("Assign an hour category to this resource before starting a timer");
  }
  const existing = await prisma.timerSession.findUnique({ where: { userId: actor.id } });
  if (existing) {
    throw new AppError("Stop or discard the running timer first", 409, "TIMER_RUNNING");
  }
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client?.trackable || client.archived) {
    throw new AppError("Account is not available for time tracking");
  }
  return prisma.timerSession.create({
    data: {
      userId: actor.id,
      clientId,
      hourCategoryId: actor.hourCategoryId,
      startedAt: new Date(),
      note,
    },
    include: { client: true },
  });
}

export async function stopTimer(actor: SessionUser) {
  const session = await prisma.timerSession.findUnique({ where: { userId: actor.id } });
  if (!session) {
    throw new NotFoundError("No running timer");
  }
  const endedAt = new Date();
  const segments = splitTimerRange(session.startedAt, endedAt);
  const created = await prisma.$transaction(async (tx) => {
    const rows = [];
    for (const segment of segments) {
      rows.push(
        await tx.timeEntry.create({
          data: {
            userId: actor.id,
            clientId: session.clientId,
            hourCategoryId: session.hourCategoryId,
            date: segment.date,
            startTime: segment.startTime,
            endTime: segment.endTime === "24:00" ? "00:00" : segment.endTime,
            durationMinutes: segment.durationMinutes,
            description: session.note,
            source: "timer",
          },
        }),
      );
    }
    await tx.timerSession.delete({ where: { userId: actor.id } });
    return rows;
  });
  return created;
}

export async function discardTimer(actor: SessionUser) {
  await prisma.timerSession.deleteMany({ where: { userId: actor.id } });
}

export async function getTimer(actor: SessionUser) {
  return prisma.timerSession.findUnique({
    where: { userId: actor.id },
    include: { client: true },
  });
}

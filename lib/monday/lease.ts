import { randomUUID } from "node:crypto";
import type { MondayIntegration, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export const MONDAY_INTEGRATION_ID = "singleton";
/** Covers 50 Monday pages with retries; owners also renew after each page. */
export const MONDAY_LEASE_DURATION_MS = 15 * 60 * 1000;

export type MondayLeaseSnapshot = Pick<MondayIntegration, "leaseToken" | "leaseExpiresAt">;
export type MondayLeaseExpected = {
  boardId?: string | null;
  secretArn?: string | null;
};

export function canAcquireMondayLease(lease: MondayLeaseSnapshot | null, now: Date): boolean {
  return !lease?.leaseToken || !lease.leaseExpiresAt || lease.leaseExpiresAt <= now;
}

export function ownsMondayLease(
  lease: MondayLeaseSnapshot | null,
  leaseToken: string,
  now: Date,
): boolean {
  return lease?.leaseToken === leaseToken && Boolean(lease.leaseExpiresAt && lease.leaseExpiresAt > now);
}

export function buildLeaseAcquireWhere(
  now: Date,
  expected?: MondayLeaseExpected,
): Prisma.MondayIntegrationWhereInput {
  return {
    id: MONDAY_INTEGRATION_ID,
    ...(expected ? { boardId: expected.boardId, secretArn: expected.secretArn } : {}),
    OR: [{ leaseToken: null }, { leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }],
  };
}

export function mondayBusyError(): AppError {
  return new AppError("Monday integration is busy", 409, "MONDAY_OPERATION_IN_PROGRESS");
}

export function mondayLeaseLostError(): AppError {
  return new AppError("Monday operation lease was lost", 409, "MONDAY_OPERATION_LEASE_LOST");
}

export async function acquireMondayOperationLease(options: {
  status: string;
  expected?: MondayLeaseExpected;
}): Promise<string> {
  const now = new Date();
  const leaseToken = randomUUID();
  await prisma.mondayIntegration.upsert({
    where: { id: MONDAY_INTEGRATION_ID },
    create: { id: MONDAY_INTEGRATION_ID, status: "DISCONNECTED" },
    update: {},
  });
  const acquired = await prisma.mondayIntegration.updateMany({
    where: buildLeaseAcquireWhere(now, options.expected),
    data: {
      leaseToken,
      leaseExpiresAt: new Date(now.getTime() + MONDAY_LEASE_DURATION_MS),
      status: options.status,
    },
  });
  if (acquired.count !== 1) {
    throw mondayBusyError();
  }
  return leaseToken;
}

export async function renewMondayLease(leaseToken: string): Promise<void> {
  const now = new Date();
  const renewed = await prisma.mondayIntegration.updateMany({
    where: {
      id: MONDAY_INTEGRATION_ID,
      leaseToken,
      leaseExpiresAt: { gt: now },
    },
    data: { leaseExpiresAt: new Date(now.getTime() + MONDAY_LEASE_DURATION_MS) },
  });
  if (renewed.count !== 1) {
    throw mondayLeaseLostError();
  }
}

export async function releaseMondayLease(leaseToken: string): Promise<void> {
  await prisma.mondayIntegration.updateMany({
    where: { id: MONDAY_INTEGRATION_ID, leaseToken },
    data: { leaseToken: null, leaseExpiresAt: null },
  });
}

export function ownerLeaseWhere(
  leaseToken: string,
  now = new Date(),
): Prisma.MondayIntegrationWhereInput {
  return {
    id: MONDAY_INTEGRATION_ID,
    leaseToken,
    leaseExpiresAt: { gt: now },
  };
}

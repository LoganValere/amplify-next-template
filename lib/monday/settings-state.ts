import type { MondayIntegration } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { MONDAY_INTEGRATION_ID } from "@/lib/monday/lease";
import { mondaySecrets } from "@/lib/monday/secrets";

export type SafeMondaySettings = {
  connected: boolean;
  boardId: string | null;
  boardName: string | null;
  status: string;
  hasSecret: boolean;
  lastTestedAt: Date | null;
  lastSyncedAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
  updatedAt: Date | null;
};

export function sanitizeMondaySettings(
  state: MondayIntegration | null,
  isAdmin: boolean,
): SafeMondaySettings {
  return {
    connected: Boolean(state?.secretArn && state.boardId),
    boardId: state?.boardId ?? null,
    boardName: state?.boardName ?? null,
    status: state?.status ?? "DISCONNECTED",
    hasSecret: Boolean(state?.secretArn),
    lastTestedAt: state?.lastTestedAt ?? null,
    lastSyncedAt: state?.lastSyncedAt ?? null,
    lastErrorAt: state?.lastErrorAt ?? null,
    lastErrorMessage: state?.lastErrorMessage
      ? isAdmin
        ? state.lastErrorMessage
        : "Monday integration needs administrator attention"
      : null,
    updatedAt: state?.updatedAt ?? null,
  };
}

export async function getMondayIntegration(): Promise<MondayIntegration | null> {
  return prisma.mondayIntegration.findUnique({ where: { id: MONDAY_INTEGRATION_ID } });
}

export async function getSafeMondaySettings(isAdmin: boolean): Promise<SafeMondaySettings> {
  return sanitizeMondaySettings(await getMondayIntegration(), isAdmin);
}

export async function getSavedMondayToken(): Promise<{
  token: string;
  state: MondayIntegration;
}> {
  const state = await getMondayIntegration();
  if (!state?.boardId) {
    throw new AppError("Monday integration is not configured", 409, "MONDAY_NOT_CONFIGURED");
  }
  const token = await mondaySecrets.get(state.secretArn);
  if (!token) {
    throw new AppError("Monday credentials are not configured", 409, "MONDAY_NOT_CONFIGURED");
  }
  return { token, state };
}

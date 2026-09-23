import type { MondayIntegration } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  createMondayClient,
  MondayColumnsError,
  type MondayBoard,
  type MondayIdentity,
} from "@/lib/monday/client";
import {
  acquireMondayOperationLease,
  MONDAY_INTEGRATION_ID,
  mondayLeaseLostError,
  ownerLeaseWhere,
  releaseMondayLease,
} from "@/lib/monday/lease";
import { mondaySecrets } from "@/lib/monday/secrets";
import {
  getMondayIntegration,
  getSafeMondaySettings,
  getSavedMondayToken,
  sanitizeMondaySettings,
  type SafeMondaySettings,
} from "@/lib/monday/settings-state";

export { MONDAY_INTEGRATION_ID };
export {
  getMondayIntegration,
  getSafeMondaySettings,
  getSavedMondayToken,
  sanitizeMondaySettings,
};
export type { SafeMondaySettings };
export type ConfigureMondayDeps = {
  inspect: () => Promise<{ board: { id: string; name: string } }>;
  acquire: () => Promise<string>;
  load: () => Promise<
    Pick<MondayIntegration, "boardId" | "secretArn" | "pendingDeleteSecretArn"> | null
  >;
  saveSecret: (token: string, secretArn?: string | null) => Promise<string>;
  deleteSecret: (secretArn: string) => Promise<void>;
  finalize: (
    leaseToken: string,
    data: { boardId: string; boardName: string; secretArn: string },
  ) => Promise<number>;
  finalizeFailure: (leaseToken: string, restoreConnected: boolean, message: string) => Promise<number>;
  release: (leaseToken: string) => Promise<void>;
};

export async function configureMondaySettingsWith(
  input: { token: string },
  deps: ConfigureMondayDeps,
): Promise<void> {
  const inspection = await deps.inspect();
  let leaseToken: string | undefined;
  let orphanArn: string | null = null;
  let restoreConnected = false;
  try {
    leaseToken = await deps.acquire();
    const current = await deps.load();
    restoreConnected = Boolean(current?.secretArn && current.boardId);
    if (current?.pendingDeleteSecretArn) {
      await deps.deleteSecret(current.pendingDeleteSecretArn);
    }
    const previousArn = current?.secretArn ?? null;
    const secretArn = await deps.saveSecret(input.token, previousArn);
    if (!previousArn) {
      orphanArn = secretArn;
    }
    const finalized = await deps.finalize(leaseToken, {
      boardId: inspection.board.id,
      boardName: inspection.board.name,
      secretArn,
    });
    if (finalized !== 1) {
      throw mondayLeaseLostError();
    }
    orphanArn = null;
  } catch (error) {
    if (leaseToken) {
      try {
        await deps.finalizeFailure(
          leaseToken,
          restoreConnected,
          publicMondayError(error),
        );
      } catch (finalizeError) {
        console.error("Unable to finalize failed Monday configuration", finalizeError);
      }
    }
    if (orphanArn) {
      try {
        await deps.deleteSecret(orphanArn);
      } catch (cleanupError) {
        console.error("Unable to remove orphaned Monday secret", cleanupError);
      }
    }
    throw error;
  } finally {
    if (leaseToken) {
      await deps.release(leaseToken);
    }
  }
}

export async function configureMondayIntegration(input: {
  token: string;
  boardId: string;
}): Promise<SafeMondaySettings> {
  const client = createMondayClient(input.token);
  await configureMondaySettingsWith(input, {
    inspect: async () => {
      await client.validateToken();
      const inspection = await client.inspectBoard(input.boardId);
      if (inspection.missingColumnIds.length) {
        throw new MondayColumnsError(inspection.missingColumnIds);
      }
      return inspection;
    },
    acquire: () => acquireMondayOperationLease({ status: "CONFIGURING" }),
    load: getMondayIntegration,
    saveSecret: (token, secretArn) => mondaySecrets.save(token, secretArn),
    deleteSecret: (secretArn) => mondaySecrets.delete(secretArn),
    finalize: async (leaseToken, data) => {
      const result = await prisma.mondayIntegration.updateMany({
        where: ownerLeaseWhere(leaseToken),
        data: {
          boardId: data.boardId,
          boardName: data.boardName,
          secretArn: data.secretArn,
          status: "CONNECTED",
          lastTestedAt: new Date(),
          lastErrorAt: null,
          lastErrorMessage: null,
          pendingDeleteSecretArn: null,
        },
      });
      return result.count;
    },
    finalizeFailure: async (leaseToken, restoreConnected, message) => {
      const result = await prisma.mondayIntegration.updateMany({
        where: ownerLeaseWhere(leaseToken),
        data: {
          status: restoreConnected ? "CONNECTED" : "ERROR",
          lastErrorAt: new Date(),
          lastErrorMessage: message,
        },
      });
      return result.count;
    },
    release: releaseMondayLease,
  });
  return getSafeMondaySettings(true);
}

export async function changeMondayBoard(boardId: string): Promise<SafeMondaySettings> {
  const { token } = await getSavedMondayToken();
  return configureMondayIntegration({ token, boardId });
}

export type DisconnectMondayDeps = {
  acquire: () => Promise<string>;
  load: () => Promise<Pick<MondayIntegration, "secretArn" | "pendingDeleteSecretArn"> | null>;
  finalizeDisconnect: (leaseToken: string, pendingArn: string | null) => Promise<number>;
  remove: (secretArn: string) => Promise<void>;
  clearPending: (leaseToken: string, secretArn: string) => Promise<void>;
  release: (leaseToken: string) => Promise<void>;
};

export async function disconnectMondaySettingsWith(deps: DisconnectMondayDeps): Promise<void> {
  const leaseToken = await deps.acquire();
  try {
    const pendingArn = pendingSecretForDisconnect(await deps.load());
    const finalized = await deps.finalizeDisconnect(leaseToken, pendingArn);
    if (finalized !== 1) {
      throw mondayLeaseLostError();
    }
    if (pendingArn) {
      await deps.remove(pendingArn);
      await deps.clearPending(leaseToken, pendingArn);
    }
  } finally {
    await deps.release(leaseToken);
  }
}

export async function disconnectMondayIntegration(): Promise<SafeMondaySettings> {
  await disconnectMondaySettingsWith({
    acquire: () => acquireMondayOperationLease({ status: "DISCONNECTING" }),
    load: getMondayIntegration,
    finalizeDisconnect: async (leaseToken, pendingArn) => {
      const result = await prisma.mondayIntegration.updateMany({
        where: ownerLeaseWhere(leaseToken),
        data: {
          boardId: null,
          boardName: null,
          secretArn: null,
          pendingDeleteSecretArn: pendingArn,
          status: pendingArn ? "DISCONNECTING" : "DISCONNECTED",
          lastErrorAt: null,
          lastErrorMessage: null,
        },
      });
      return result.count;
    },
    remove: (secretArn) => mondaySecrets.delete(secretArn),
    clearPending: async (leaseToken, secretArn) => {
      await prisma.mondayIntegration.updateMany({
        where: { ...ownerLeaseWhere(leaseToken), pendingDeleteSecretArn: secretArn },
        data: { pendingDeleteSecretArn: null, status: "DISCONNECTED" },
      });
    },
    release: releaseMondayLease,
  });
  return getSafeMondaySettings(true);
}

export type TestMondayDeps = {
  acquire: () => Promise<string>;
  loadToken: () => Promise<{ token: string; state: MondayIntegration }>;
  validate: (token: string) => Promise<MondayIdentity>;
  inspect: (token: string, boardId: string) => Promise<{ missingColumnIds: string[] }>;
  finalizeSuccess: (leaseToken: string) => Promise<MondayIntegration>;
  finalizeError: (leaseToken: string, message: string) => Promise<void>;
  release: (leaseToken: string) => Promise<void>;
};

export async function testMondayIntegrationWith(deps: TestMondayDeps): Promise<{
  identity: MondayIdentity;
  settings: SafeMondaySettings;
}> {
  const leaseToken = await deps.acquire();
  try {
    const { token, state } = await deps.loadToken();
    const identity = await deps.validate(token);
    const inspection = await deps.inspect(token, state.boardId!);
    if (inspection.missingColumnIds.length) {
      throw new MondayColumnsError(inspection.missingColumnIds);
    }
    const finalized = await deps.finalizeSuccess(leaseToken);
    return { identity, settings: sanitizeMondaySettings(finalized, true) };
  } catch (error) {
    await deps.finalizeError(leaseToken, publicMondayError(error));
    throw error;
  } finally {
    await deps.release(leaseToken);
  }
}

export async function testMondayIntegration(): Promise<{
  identity: MondayIdentity;
  settings: SafeMondaySettings;
}> {
  return testMondayIntegrationWith({
    acquire: () => acquireMondayOperationLease({ status: "TESTING" }),
    loadToken: getSavedMondayToken,
    validate: (token) => createMondayClient(token).validateToken(),
    inspect: (token, boardId) => createMondayClient(token).inspectBoard(boardId),
    finalizeSuccess: async (leaseToken) => {
      const now = new Date();
      const result = await prisma.mondayIntegration.updateMany({
        where: ownerLeaseWhere(leaseToken),
        data: {
          status: "CONNECTED",
          lastTestedAt: now,
          lastErrorAt: null,
          lastErrorMessage: null,
        },
      });
      if (result.count !== 1) throw mondayLeaseLostError();
      return (await getMondayIntegration())!;
    },
    finalizeError: async (leaseToken, message) => {
      await prisma.mondayIntegration.updateMany({
        where: ownerLeaseWhere(leaseToken),
        data: { status: "ERROR", lastErrorAt: new Date(), lastErrorMessage: message },
      });
    },
    release: releaseMondayLease,
  });
}

export async function listAccessibleMondayBoards(submittedToken?: string): Promise<MondayBoard[]> {
  const token = submittedToken ?? (await getSavedMondayToken()).token;
  return createMondayClient(token).listBoards();
}

export function publicMondayError(error: unknown): string {
  return error instanceof AppError ? error.message : "Unexpected Monday integration error";
}

export function pendingSecretForDisconnect(
  state: Pick<MondayIntegration, "secretArn" | "pendingDeleteSecretArn"> | null,
): string | null {
  return state?.pendingDeleteSecretArn ?? state?.secretArn ?? null;
}

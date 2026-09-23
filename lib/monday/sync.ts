import type { Client, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createMondayClient, MondayColumnsError, type MondayAccountItem } from "@/lib/monday/client";
import {
  acquireMondayOperationLease,
  mondayLeaseLostError,
  MONDAY_INTEGRATION_ID,
  ownsMondayLease,
  ownerLeaseWhere,
  releaseMondayLease,
  renewMondayLease,
} from "@/lib/monday/lease";
import { getSavedMondayToken, publicMondayError } from "@/lib/monday/settings";

export type MondaySyncStats = {
  created: number;
  updated: number;
  archived: number;
  total: number;
};

type ClientData = {
  mondayItemId: string;
  mondayBoardId: string | null;
  name: string;
  clientLabel: string | null;
  status: string;
  trackable: boolean;
  office: string | null;
  projectManager: string | null;
  accountManager: string | null;
  projectedEnd: Date | null;
  archived: boolean;
};

export type MondayReconciliation = {
  creates: ClientData[];
  updates: ClientData[];
  archiveUpdates: ClientData[];
  archiveIds: string[];
  stats: MondaySyncStats;
};

export function buildMondayReconciliation(
  existing: Array<Pick<Client, keyof ClientData>>,
  remote: MondayAccountItem[],
  boardId: string,
): MondayReconciliation {
  const existingByMondayId = new Map(existing.map((client) => [client.mondayItemId, client]));
  const remoteIds = new Set(remote.map((item) => item.id));
  const creates: ClientData[] = [];
  const updates: ClientData[] = [];
  const archiveUpdates: ClientData[] = [];

  for (const item of remote) {
    const data = toClientData(item, boardId);
    const current = existingByMondayId.get(item.id);
    if (!current) {
      creates.push(data);
    } else if (!clientDataMatches(current, data)) {
      if (!current.archived && data.archived) {
        archiveUpdates.push(data);
      } else {
        updates.push(data);
      }
    }
  }

  const archiveIds =
    remote.length === 0
      ? []
      : existing
          .filter(
            (client) =>
              client.mondayBoardId === boardId &&
              !client.archived &&
              !remoteIds.has(client.mondayItemId),
          )
          .map((client) => client.mondayItemId);
  return {
    creates,
    updates,
    archiveUpdates,
    archiveIds,
    stats: {
      created: creates.length,
      updated: updates.length,
      archived: archiveUpdates.length + archiveIds.length,
      total: remote.length,
    },
  };
}

export async function syncMondayAccounts(): Promise<MondaySyncStats> {
  const { token, state } = await getSavedMondayToken();
  const leaseToken = await acquireMondayOperationLease({
    status: "SYNCING",
    expected: { boardId: state.boardId, secretArn: state.secretArn },
  });
  const client = createMondayClient(token);
  const renew = () => renewMondayLease(leaseToken);
  try {
    const inspection = await client.inspectBoard(state.boardId!);
    if (inspection.missingColumnIds.length) {
      throw new MondayColumnsError(inspection.missingColumnIds);
    }
    await renew();
    const remote = await client.fetchAccounts(state.boardId!, { onPage: renew });
    const existing = await prisma.client.findMany();
    const reconciliation = buildMondayReconciliation(existing, remote, state.boardId!);
    await applyReconciliation(reconciliation, state.boardId!, leaseToken);
    return reconciliation.stats;
  } catch (error) {
    await finalizeMondayError(leaseToken, error);
    throw error;
  } finally {
    await releaseMondayLease(leaseToken);
  }
}

async function applyReconciliation(
  reconciliation: MondayReconciliation,
  boardId: string,
  leaseToken: string,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const lease = await transaction.mondayIntegration.findUnique({
      where: { id: MONDAY_INTEGRATION_ID },
      select: { leaseToken: true, leaseExpiresAt: true },
    });
    if (!ownsMondayLease(lease, leaseToken, new Date())) {
      throw mondayLeaseLostError();
    }
    if (reconciliation.creates.length) {
      await transaction.client.createMany({ data: reconciliation.creates });
    }
    for (const data of [...reconciliation.updates, ...reconciliation.archiveUpdates]) {
      await transaction.client.update({
        where: { mondayItemId: data.mondayItemId },
        data,
      });
    }
    if (reconciliation.archiveIds.length) {
      await transaction.client.updateMany({
        where: {
          mondayBoardId: boardId,
          mondayItemId: { in: reconciliation.archiveIds },
        },
        data: { archived: true, trackable: false },
      });
    }
    const finalized = await transaction.mondayIntegration.updateMany({
      where: ownerLeaseWhere(leaseToken),
      data: buildMondayFinalization("CONNECTED", new Date()),
    });
    if (finalized.count !== 1) {
      throw mondayLeaseLostError();
    }
  });
}

function toClientData(item: MondayAccountItem, boardId: string): ClientData {
  const trackable = item.status !== "Dead" && item.status !== "Completed";
  return {
    mondayItemId: item.id,
    mondayBoardId: boardId,
    name: item.name,
    clientLabel: item.clientLabel || null,
    status: item.status,
    trackable,
    office: item.office || null,
    projectManager: item.projectManager || null,
    accountManager: item.accountManager || null,
    projectedEnd: item.projectedEnd ? new Date(item.projectedEnd) : null,
    archived: !trackable,
  };
}

function clientDataMatches(current: Pick<Client, keyof ClientData>, next: ClientData): boolean {
  return (
    current.name === next.name &&
    current.clientLabel === next.clientLabel &&
    current.status === next.status &&
    current.trackable === next.trackable &&
    current.office === next.office &&
    current.projectManager === next.projectManager &&
    current.accountManager === next.accountManager &&
    current.projectedEnd?.getTime() === next.projectedEnd?.getTime() &&
    current.archived === next.archived &&
    current.mondayBoardId === next.mondayBoardId
  );
}

export function buildMondayFinalization(
  status: "CONNECTED" | "ERROR",
  now: Date,
  errorMessage?: string,
): Prisma.MondayIntegrationUpdateManyMutationInput {
  return {
    status,
    lastSyncedAt: status === "CONNECTED" ? now : undefined,
    lastErrorAt: status === "ERROR" ? now : null,
    lastErrorMessage: status === "ERROR" ? errorMessage : null,
  };
}

async function finalizeMondayError(leaseToken: string, error: unknown): Promise<void> {
  await prisma.mondayIntegration.updateMany({
    where: ownerLeaseWhere(leaseToken),
    data: buildMondayFinalization("ERROR", new Date(), publicMondayError(error)),
  });
}

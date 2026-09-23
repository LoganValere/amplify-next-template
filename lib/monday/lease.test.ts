import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLeaseAcquireWhere,
  canAcquireMondayLease,
  mondayBusyError,
  MONDAY_INTEGRATION_ID,
  ownsMondayLease,
} from "./lease";
import { buildMondayFinalization } from "./sync";

test("lease helpers reject active or foreign leases and build owner finalization", () => {
  const now = new Date("2026-09-23T12:00:00Z");
  const future = new Date("2026-09-23T12:10:00Z");
  const expired = new Date("2026-09-23T11:59:00Z");
  assert.equal(canAcquireMondayLease(null, now), true);
  assert.equal(canAcquireMondayLease({ leaseToken: "old", leaseExpiresAt: expired }, now), true);
  assert.equal(canAcquireMondayLease({ leaseToken: "active", leaseExpiresAt: future }, now), false);
  assert.equal(ownsMondayLease({ leaseToken: "owner", leaseExpiresAt: future }, "owner", now), true);
  assert.equal(ownsMondayLease({ leaseToken: "other", leaseExpiresAt: future }, "owner", now), false);
  assert.deepEqual(buildMondayFinalization("CONNECTED", now), {
    status: "CONNECTED",
    lastSyncedAt: now,
    lastErrorAt: null,
    lastErrorMessage: null,
  });
});

test("sync acquire requires a free lease and the expected board/secret", () => {
  const now = new Date("2026-09-23T12:00:00Z");
  const where = buildLeaseAcquireWhere(now, { boardId: "board-a", secretArn: "arn:secret" });
  assert.equal(where.id, MONDAY_INTEGRATION_ID);
  assert.equal(where.boardId, "board-a");
  assert.equal(where.secretArn, "arn:secret");
  assert.deepEqual(where.OR, [
    { leaseToken: null },
    { leaseExpiresAt: null },
    { leaseExpiresAt: { lte: now } },
  ]);
});

test("configure and disconnect acquire without expected identifiers so they still conflict on a busy lease", () => {
  const now = new Date("2026-09-23T12:00:00Z");
  const where = buildLeaseAcquireWhere(now);
  assert.equal(where.boardId, undefined);
  assert.equal(where.secretArn, undefined);
  const busy = mondayBusyError();
  assert.equal(busy.status, 409);
  assert.equal(busy.code, "MONDAY_OPERATION_IN_PROGRESS");
});

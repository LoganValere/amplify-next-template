import assert from "node:assert/strict";
import test from "node:test";
import type { Client } from "@prisma/client";
import type { MondayAccountItem } from "./client";
import { buildMondayReconciliation } from "./sync";

type ExistingClient = Pick<
  Client,
  | "mondayItemId"
  | "mondayBoardId"
  | "name"
  | "clientLabel"
  | "status"
  | "trackable"
  | "office"
  | "projectManager"
  | "accountManager"
  | "projectedEnd"
  | "archived"
>;

function existing(id: string, overrides: Partial<ExistingClient> = {}): ExistingClient {
  return {
    mondayItemId: id,
    mondayBoardId: "board-a",
    name: `Client ${id}`,
    clientLabel: null,
    status: "Active",
    trackable: true,
    office: null,
    projectManager: null,
    accountManager: null,
    projectedEnd: null,
    archived: false,
    ...overrides,
  };
}

function remote(id: string, overrides: Partial<MondayAccountItem> = {}): MondayAccountItem {
  return {
    id,
    name: `Client ${id}`,
    clientLabel: "",
    status: "Active",
    office: "",
    projectManager: "",
    accountManager: "",
    projectedEnd: null,
    ...overrides,
  };
}

test("reconciliation reports creates, updates, and safe archives", () => {
  const result = buildMondayReconciliation(
    [existing("same"), existing("completed"), existing("removed")],
    [remote("same"), remote("completed", { status: "Completed" }), remote("new")],
    "board-a",
  );
  assert.deepEqual(result.stats, { created: 1, updated: 0, archived: 2, total: 3 });
  assert.deepEqual(result.creates.map((item) => item.mondayItemId), ["new"]);
  assert.deepEqual(result.archiveUpdates.map((item) => item.mondayItemId), ["completed"]);
  assert.deepEqual(result.archiveIds, ["removed"]);
});

test("does not mass-archive when Monday returns an empty board", () => {
  const result = buildMondayReconciliation([existing("keep")], [], "board-a");
  assert.deepEqual(result.archiveIds, []);
  assert.deepEqual(result.stats, { created: 0, updated: 0, archived: 0, total: 0 });
});

test("board switching never archives prior-board or unowned clients", () => {
  const result = buildMondayReconciliation(
    [
      existing("current", { mondayBoardId: "board-b" }),
      existing("prior", { mondayBoardId: "board-a" }),
      existing("legacy", { mondayBoardId: null }),
    ],
    [remote("new")],
    "board-b",
  );
  assert.deepEqual(result.archiveIds, ["current"]);
});

test("matching legacy clients are adopted by the current board", () => {
  const result = buildMondayReconciliation(
    [existing("legacy", { mondayBoardId: null })],
    [remote("legacy")],
    "board-b",
  );
  assert.equal(result.updates[0].mondayBoardId, "board-b");
  assert.equal(result.stats.updated, 1);
});

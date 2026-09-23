import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "@/lib/errors";
import type { MondayIntegration } from "@prisma/client";
import { MondayColumnsError } from "./client";
import {
  configureMondaySettingsWith,
  disconnectMondaySettingsWith,
  pendingSecretForDisconnect,
  sanitizeMondaySettings,
  testMondayIntegrationWith,
} from "./settings";

const state: MondayIntegration = {
  id: "singleton",
  boardId: "123",
  boardName: "Accounts",
  secretArn: "arn:aws:secretsmanager:region:account:secret:private",
  pendingDeleteSecretArn: null,
  status: "ERROR",
  lastTestedAt: new Date("2026-09-20T12:00:00Z"),
  lastSyncedAt: null,
  lastErrorAt: new Date("2026-09-20T12:01:00Z"),
  lastErrorMessage: "Monday board is missing required columns: people",
  leaseToken: null,
  leaseExpiresAt: null,
  createdAt: new Date("2026-09-20T11:00:00Z"),
  updatedAt: new Date("2026-09-20T12:01:00Z"),
};

test("settings response never exposes the secret reference", () => {
  const safe = sanitizeMondaySettings(state, true);
  assert.equal(safe.connected, true);
  assert.equal(safe.hasSecret, true);
  assert.equal(Object.hasOwn(safe, "secretArn"), false);
});

test("disconnect retries pending deletion and tolerates a missing ARN", () => {
  assert.equal(pendingSecretForDisconnect(null), null);
  assert.equal(
    pendingSecretForDisconnect({ secretArn: null, pendingDeleteSecretArn: "arn:pending" }),
    "arn:pending",
  );
  assert.equal(
    pendingSecretForDisconnect({ secretArn: "arn:active", pendingDeleteSecretArn: null }),
    "arn:active",
  );
});

test("staff receive a generic error while admins receive actionable text", () => {
  assert.equal(
    sanitizeMondaySettings(state, false).lastErrorMessage,
    "Monday integration needs administrator attention",
  );
  assert.equal(
    sanitizeMondaySettings(state, true).lastErrorMessage,
    "Monday board is missing required columns: people",
  );
});

test("configure and disconnect return Conflict before secret writes when a lease is busy", async () => {
  const events: string[] = [];
  const busy = new AppError("Monday integration is busy", 409, "MONDAY_OPERATION_IN_PROGRESS");
  await assert.rejects(
    configureMondaySettingsWith(
      { token: "new-token" },
      {
        inspect: async () => {
          events.push("inspect");
          return { board: { id: "1", name: "Accounts" } };
        },
        acquire: async () => {
          events.push("acquire");
          throw busy;
        },
        load: async () => {
          events.push("load");
          return state;
        },
        saveSecret: async () => {
          events.push("save");
          return "arn:new";
        },
        deleteSecret: async () => {
          events.push("delete");
        },
        finalize: async () => {
          events.push("finalize");
          return 1;
        },
        finalizeFailure: async () => {
          events.push("finalize-failure");
          return 1;
        },
        release: async () => {
          events.push("release");
        },
      },
    ),
    busy,
  );
  assert.deepEqual(events, ["inspect", "acquire"]);

  events.length = 0;
  await assert.rejects(
    disconnectMondaySettingsWith({
      acquire: async () => {
        events.push("acquire");
        throw busy;
      },
      load: async () => {
        events.push("load");
        return state;
      },
      finalizeDisconnect: async () => {
        events.push("finalize");
        return 1;
      },
      remove: async () => {
        events.push("remove");
      },
      clearPending: async () => {
        events.push("clear");
      },
      release: async () => {
        events.push("release");
      },
    }),
    busy,
  );
  assert.deepEqual(events, ["acquire"]);
});

test("lost configure finalization deletes an orphan secret and still releases the lease", async () => {
  const events: string[] = [];
  await assert.rejects(
    configureMondaySettingsWith(
      { token: "new-token" },
      {
        inspect: async () => ({ board: { id: "1", name: "Accounts" } }),
        acquire: async () => "lease-1",
        load: async () => ({ boardId: null, secretArn: null, pendingDeleteSecretArn: null }),
        saveSecret: async () => "arn:orphan",
        deleteSecret: async (arn) => {
          events.push(`delete:${arn}`);
        },
        finalize: async () => 0,
        finalizeFailure: async (token, restore, message) => {
          events.push(`failure:${token}:${restore}:${message}`);
          return 0;
        },
        release: async (token) => {
          events.push(`release:${token}`);
        },
      },
    ),
  );
  assert.deepEqual(events, [
    "failure:lease-1:false:Monday operation lease was lost",
    "delete:arn:orphan",
    "release:lease-1",
  ]);
});

test("updating an existing secret is not treated as an orphan after a failed finalize", async () => {
  const deleted: string[] = [];
  await assert.rejects(
    configureMondaySettingsWith(
      { token: "new-token" },
      {
        inspect: async () => ({ board: { id: "1", name: "Accounts" } }),
        acquire: async () => "lease-2",
        load: async () => ({
          boardId: "123",
          secretArn: "arn:existing",
          pendingDeleteSecretArn: null,
        }),
        saveSecret: async () => "arn:existing",
        deleteSecret: async (arn) => {
          deleted.push(arn);
        },
        finalize: async () => 0,
        finalizeFailure: async (_token, restore) => {
          assert.equal(restore, true);
          return 0;
        },
        release: async () => undefined,
      },
    ),
  );
  assert.deepEqual(deleted, []);
});

test("configure failure marks a new connection ERROR before releasing its lease", async () => {
  const events: string[] = [];
  await assert.rejects(
    configureMondaySettingsWith(
      { token: "new-token" },
      {
        inspect: async () => ({ board: { id: "1", name: "Accounts" } }),
        acquire: async () => "lease-new",
        load: async () => ({ boardId: null, secretArn: null, pendingDeleteSecretArn: null }),
        saveSecret: async () => {
          throw new AppError("Secret write failed", 502, "SECRET_WRITE_FAILED");
        },
        deleteSecret: async () => undefined,
        finalize: async () => 1,
        finalizeFailure: async (token, restore, message) => {
          events.push(`failure:${token}:${restore}:${message}`);
          return 1;
        },
        release: async (token) => { events.push(`release:${token}`); },
      },
    ),
    /Secret write failed/,
  );
  assert.deepEqual(events, [
    "failure:lease-new:false:Secret write failed",
    "release:lease-new",
  ]);
});

test("configure failure restores an existing valid connection and records its error", async () => {
  const events: string[] = [];
  await assert.rejects(
    configureMondaySettingsWith(
      { token: "new-token" },
      {
        inspect: async () => ({ board: { id: "1", name: "Accounts" } }),
        acquire: async () => "lease-existing",
        load: async () => ({
          boardId: "123",
          secretArn: "arn:existing",
          pendingDeleteSecretArn: null,
        }),
        saveSecret: async () => {
          throw new Error("credential internals");
        },
        deleteSecret: async () => undefined,
        finalize: async () => 1,
        finalizeFailure: async (token, restore, message) => {
          events.push(`failure:${token}:${restore}:${message}`);
          return 1;
        },
        release: async (token) => { events.push(`release:${token}`); },
      },
    ),
    /credential internals/,
  );
  assert.deepEqual(events, [
    "failure:lease-existing:true:Unexpected Monday integration error",
    "release:lease-existing",
  ]);
});

test("reconnect after disconnect owns the lease and can replace a pending secret", async () => {
  const events: string[] = [];
  await disconnectMondaySettingsWith({
    acquire: async () => "lease-d",
    load: async () => ({ secretArn: "arn:old", pendingDeleteSecretArn: null }),
    finalizeDisconnect: async (token, pendingArn) => {
      events.push(`disconnect:${token}:${pendingArn}`);
      return 1;
    },
    remove: async (arn) => {
      events.push(`remove:${arn}`);
    },
    clearPending: async (_token, arn) => {
      events.push(`cleared:${arn}`);
    },
    release: async () => {
      events.push("released-disconnect");
    },
  });
  await configureMondaySettingsWith(
    { token: "replacement" },
    {
      inspect: async () => ({ board: { id: "9", name: "Accounts" } }),
      acquire: async () => "lease-c",
      load: async () => ({
        boardId: null,
        secretArn: null,
        pendingDeleteSecretArn: "arn:old",
      }),
      saveSecret: async (_token, previous) => {
        events.push(`save:${previous ?? "none"}`);
        return "arn:new";
      },
      deleteSecret: async (arn) => {
        events.push(`delete:${arn}`);
      },
      finalize: async (token, data) => {
        events.push(`finalize:${token}:${data.secretArn}`);
        return 1;
      },
      finalizeFailure: async () => {
        events.push("unexpected-failure");
        return 1;
      },
      release: async () => {
        events.push("released-configure");
      },
    },
  );
  assert.deepEqual(events, [
    "disconnect:lease-d:arn:old",
    "remove:arn:old",
    "cleared:arn:old",
    "released-disconnect",
    "delete:arn:old",
    "save:none",
    "finalize:lease-c:arn:new",
    "released-configure",
  ]);
});

test("connection test owns a lease and persists its successful timestamp", async () => {
  const events: string[] = [];
  const testedState = { ...state, status: "CONNECTED", lastTestedAt: new Date("2026-09-23T12:00:00Z") };
  const result = await testMondayIntegrationWith({
    acquire: async () => { events.push("acquire"); return "test-lease"; },
    loadToken: async () => { events.push("load"); return { token: "saved-token", state }; },
    validate: async () => {
      events.push("validate");
      return {
        id: "1",
        name: "Admin",
        email: "a@example.com",
        account: { id: "2", name: "Valere" },
      };
    },
    inspect: async () => { events.push("inspect"); return { missingColumnIds: [] }; },
    finalizeSuccess: async (leaseToken) => { events.push(`success:${leaseToken}`); return testedState; },
    finalizeError: async () => { events.push("error"); },
    release: async (leaseToken) => { events.push(`release:${leaseToken}`); },
  });
  assert.deepEqual(result.settings, sanitizeMondaySettings(testedState, true));
  assert.deepEqual(events, ["acquire", "load", "validate", "inspect", "success:test-lease", "release:test-lease"]);
  assert.equal(result.identity.account.name, "Valere");
});

test("connection test records a sanitized owned error and releases its lease", async () => {
  const events: string[] = [];
  await assert.rejects(
    testMondayIntegrationWith({
      acquire: async () => "test-lease",
      loadToken: async () => ({ token: "saved-token", state }),
      validate: async () => ({
        id: "1",
        name: "Admin",
        email: "a@example.com",
        account: { id: "2", name: "Valere" },
      }),
      inspect: async () => ({ missingColumnIds: ["people"] }),
      finalizeSuccess: async () => { throw new Error("unexpected success"); },
      finalizeError: async (leaseToken, message) => { events.push(`${leaseToken}:${message}`); },
      release: async (leaseToken) => { events.push(`release:${leaseToken}`); },
    }),
    MondayColumnsError,
  );
  assert.deepEqual(events, [
    "test-lease:Monday board is missing required columns: people",
    "release:test-lease",
  ]);
});

test("connection test returns conflict without reads when another operation owns the lease", async () => {
  const events: string[] = [];
  const busy = new AppError("Monday integration is busy", 409, "MONDAY_OPERATION_IN_PROGRESS");
  await assert.rejects(
    testMondayIntegrationWith({
      acquire: async () => { events.push("acquire"); throw busy; },
      loadToken: async () => { events.push("load"); return { token: "secret", state }; },
      validate: async () => { throw new Error("unexpected validate"); },
      inspect: async () => ({ missingColumnIds: [] }),
      finalizeSuccess: async () => state,
      finalizeError: async () => undefined,
      release: async () => { events.push("release"); },
    }),
    busy,
  );
  assert.deepEqual(events, ["acquire"]);
});

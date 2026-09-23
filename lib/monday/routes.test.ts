import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenError } from "../errors";
import { readMondaySettingsInput } from "./requests";
import {
  createMondaySettingsHandlers,
  createMondayStatusHandler,
  createMondaySyncHandler,
  createMondayTestHandler,
} from "./route-handlers";

const safeSettings = {
  connected: true,
  boardId: "4476095209",
  boardName: "Accounts",
  status: "CONNECTED",
  hasSecret: true,
  lastTestedAt: null,
  lastSyncedAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
  updatedAt: null,
};

const forbidden = async () => {
  throw new ForbiddenError();
};

test("Monday management routes require admin authorization", async () => {
  const settings = createMondaySettingsHandlers({
    authorize: forbidden,
    readInput: readMondaySettingsInput,
    getSettings: async () => safeSettings,
    configure: async () => safeSettings,
    changeBoard: async () => safeSettings,
    disconnect: async () => safeSettings,
  } as never);
  const handlers = [
    settings.GET(),
    settings.PUT(new Request("http://test/settings", {
      method: "PUT",
      body: JSON.stringify({ boardId: "1" }),
    })),
    settings.DELETE(),
    createMondayTestHandler({
      authorize: forbidden,
      testConnection: async () => ({ identity: {}, settings: safeSettings }),
    } as never)(),
    createMondaySyncHandler({
      authorize: forbidden,
      sync: async () => ({ created: 0, updated: 0, archived: 0 }),
    } as never)(),
  ];
  for (const response of await Promise.all(handlers)) {
    assert.equal(response.status, 403);
  }
});

test("Monday settings rejects invalid Zod input before any mutation", async () => {
  let mutated = false;
  const handlers = createMondaySettingsHandlers({
    authorize: async () => undefined,
    readInput: readMondaySettingsInput,
    getSettings: async () => safeSettings,
    configure: async () => { mutated = true; return safeSettings; },
    changeBoard: async () => { mutated = true; return safeSettings; },
    disconnect: async () => safeSettings,
  } as never);
  const response = await handlers.PUT(new Request("http://test/settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "private", boardId: "not-a-number" }),
  }));
  assert.equal(response.status, 400);
  assert.equal(mutated, false);
  assert.deepEqual(await response.json(), {
    error: "A numeric boardId is required",
    code: "INVALID_REQUEST",
  });
});

test("Monday settings responses and disconnect payload remain secret-safe", async () => {
  let disconnected = 0;
  const handlers = createMondaySettingsHandlers({
    authorize: async () => undefined,
    readInput: readMondaySettingsInput,
    getSettings: async () => safeSettings,
    configure: async () => safeSettings,
    changeBoard: async () => safeSettings,
    disconnect: async () => { disconnected += 1; return { ...safeSettings, connected: false }; },
  } as never);
  const putResponse = await handlers.PUT(new Request("http://test/settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "submitted-secret", boardId: "4476095209" }),
  }));
  for (const response of [await handlers.GET(), putResponse, await handlers.DELETE()]) {
    const serialized = JSON.stringify(await response.json());
    assert.doesNotMatch(serialized, /secretArn|token|arn:aws/i);
  }
  assert.equal(disconnected, 1);
});

test("Monday status limits management and sanitizes staff errors", async () => {
  const handler = createMondayStatusHandler({
    authorize: async () => ({ role: "STAFF" }),
    getSettings: async (isAdmin: boolean) => ({
      ...safeSettings,
      lastErrorMessage: isAdmin ? "private detail" : "Monday integration needs administrator attention",
    }),
  } as never);
  const response = await handler();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ...safeSettings,
    lastErrorMessage: "Monday integration needs administrator attention",
    canManage: false,
  });
});

test("Monday test and sync return only their safe public contracts", async () => {
  const testResponse = await createMondayTestHandler({
    authorize: async () => undefined,
    testConnection: async () => ({
      identity: { id: "1", name: "Admin", email: "admin@example.com", account: { id: "2", name: "Valere" } },
      settings: safeSettings,
    }),
  } as never)();
  const syncResponse = await createMondaySyncHandler({
    authorize: async () => undefined,
    sync: async () => ({ created: 1, updated: 2, archived: 3 }),
  } as never)();
  for (const response of [testResponse, syncResponse]) {
    const serialized = JSON.stringify(await response.json());
    assert.doesNotMatch(serialized, /secretArn|token|arn:aws/i);
  }
});

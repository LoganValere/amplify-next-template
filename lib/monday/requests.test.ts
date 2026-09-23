import assert from "node:assert/strict";
import test from "node:test";
import { readMondaySettingsInput } from "./requests";

function request(body: unknown) {
  return new Request("http://localhost/api/monday/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("Monday settings accepts board-only changes with the saved token", async () => {
  assert.deepEqual(await readMondaySettingsInput(request({ boardId: "123" })), { boardId: "123" });
});

test("Monday settings remains backward compatible with token reconnects", async () => {
  assert.deepEqual(
    await readMondaySettingsInput(request({ boardId: "123", token: "replacement" })),
    { boardId: "123", token: "replacement" },
  );
});

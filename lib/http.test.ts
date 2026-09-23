import assert from "node:assert/strict";
import test from "node:test";
import { jsonError } from "./http";

test("unexpected route errors are logged but return only a generic 500 payload", async () => {
  const original = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => { logged.push(args); };
  try {
    const response = jsonError(new Error("database password leaked"));
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: "An unexpected error occurred",
      code: "INTERNAL",
    });
    assert.equal(logged.length, 1);
    assert.match(String(logged[0]?.[1]), /database password leaked/);
  } finally {
    console.error = original;
  }
});

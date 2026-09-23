import assert from "node:assert/strict";
import test from "node:test";
import { mondayErrorToCopy, stableMondayWizardMode } from "./wizard";

test("wizard returns to the correct stable mode after load or cancel", () => {
  assert.equal(stableMondayWizardMode(false), "token");
  assert.equal(stableMondayWizardMode(true), "view");
});

test("column errors preserve structured missing column IDs", () => {
  const copy = mondayErrorToCopy({
    code: "MONDAY_COLUMNS_INVALID",
    missingColumnIds: ["people", "status0"],
  });
  assert.equal(copy.title, "Required columns are missing");
  assert.deepEqual(copy.missingColumnIds, ["people", "status0"]);
});

test("operational Monday errors have actionable safe copy", () => {
  assert.match(mondayErrorToCopy({ code: "MONDAY_OPERATION_IN_PROGRESS" }).message, /Wait/);
  assert.match(mondayErrorToCopy({ code: "MONDAY_INVALID_TOKEN" }).message, /token/i);
  assert.match(mondayErrorToCopy({ code: "MONDAY_RATE_LIMITED", retryAfterMs: 2500 }).message, /3 seconds/);
  assert.doesNotMatch(mondayErrorToCopy({ code: "MONDAY_UNAVAILABLE" }).message, /token/i);
});

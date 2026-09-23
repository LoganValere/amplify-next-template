import assert from "node:assert/strict";
import test from "node:test";
import { timeWindowError } from "./time-window";

test("an omitted window is allowed", () => {
  assert.equal(timeWindowError(undefined, undefined), null);
  assert.equal(timeWindowError("", ""), null);
  assert.equal(timeWindowError(null, null), null);
});

test("a half-filled window is rejected", () => {
  assert.match(timeWindowError("09:00", "") ?? "", /both a start and end time/);
  assert.match(timeWindowError("", "10:00") ?? "", /both a start and end time/);
});

test("an ordered window is allowed", () => {
  assert.equal(timeWindowError("09:00", "10:30"), null);
  assert.equal(timeWindowError("00:00", "23:59"), null);
});

test("an end at or before the start is rejected", () => {
  assert.match(timeWindowError("10:00", "09:00") ?? "", /later than start time/);
  assert.match(timeWindowError("10:00", "10:00") ?? "", /later than start time/);
});

test("malformed times are rejected", () => {
  assert.match(timeWindowError("9:00", "10:00") ?? "", /HH:MM/);
  assert.match(timeWindowError("09:00", "24:00") ?? "", /HH:MM/);
  assert.match(timeWindowError("09:60", "10:00") ?? "", /HH:MM/);
});

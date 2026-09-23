import assert from "node:assert/strict";
import test from "node:test";
import { splitTimerRange } from "./split";

test("splits a run that crosses midnight into per-day segments", () => {
  const start = new Date(2026, 2, 10, 22, 15, 0);
  const end = new Date(2026, 2, 11, 1, 15, 0);
  const segments = splitTimerRange(start, end);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].date, "2026-03-10");
  assert.equal(segments[1].date, "2026-03-11");
  assert.equal(
    segments.reduce((sum, segment) => sum + segment.durationMinutes, 0),
    180,
  );
});

test("same-day timer stays one row", () => {
  const start = new Date(2026, 2, 10, 9, 0, 0);
  const end = new Date(2026, 2, 10, 10, 30, 0);
  const segments = splitTimerRange(start, end);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].durationMinutes, 90);
});

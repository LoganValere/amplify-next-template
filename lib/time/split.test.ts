import assert from "node:assert/strict";
import test from "node:test";
import { splitTimerRange } from "./split";

// Instants are written with explicit offsets so the assertions hold no matter
// which timezone the test runner sits in.
function totalMinutes(segments: { durationMinutes: number }[]) {
  return segments.reduce((sum, segment) => sum + segment.durationMinutes, 0);
}

test("splits a run that crosses midnight into per-day segments", () => {
  const start = new Date("2026-03-10T22:15:00-04:00");
  const end = new Date("2026-03-11T01:15:00-04:00");
  const segments = splitTimerRange(start, end);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].date, "2026-03-10");
  assert.equal(segments[0].endTime, "24:00");
  assert.equal(segments[1].date, "2026-03-11");
  assert.equal(segments[1].startTime, "00:00");
  assert.equal(totalMinutes(segments), 180);
});

test("same-day timer stays one row", () => {
  const start = new Date("2026-03-10T09:00:00-04:00");
  const end = new Date("2026-03-10T10:30:00-04:00");
  const segments = splitTimerRange(start, end);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].durationMinutes, 90);
});

test("an evening session that crosses UTC midnight keeps the business date", () => {
  // 22:00-23:30 in New York is 02:00-03:30 the next day in UTC.
  const start = new Date("2026-03-10T22:00:00-04:00");
  const end = new Date("2026-03-10T23:30:00-04:00");
  const segments = splitTimerRange(start, end);
  assert.deepEqual(segments, [
    { date: "2026-03-10", startTime: "22:00", endTime: "23:30", durationMinutes: 90 },
  ]);
});

test("segments break at business midnight rather than UTC midnight", () => {
  const start = new Date("2026-03-10T23:30:00-04:00");
  const end = new Date("2026-03-11T00:30:00-04:00");
  const segments = splitTimerRange(start, end);
  assert.deepEqual(segments, [
    { date: "2026-03-10", startTime: "23:30", endTime: "24:00", durationMinutes: 30 },
    { date: "2026-03-11", startTime: "00:00", endTime: "00:30", durationMinutes: 30 },
  ]);
});

test("spring-forward night records elapsed minutes, not wall-clock minutes", () => {
  // 2026-03-08 loses the 2am hour in New York.
  const start = new Date("2026-03-07T23:00:00-05:00");
  const end = new Date("2026-03-08T03:00:00-04:00");
  const segments = splitTimerRange(start, end);
  assert.deepEqual(segments, [
    { date: "2026-03-07", startTime: "23:00", endTime: "24:00", durationMinutes: 60 },
    { date: "2026-03-08", startTime: "00:00", endTime: "03:00", durationMinutes: 120 },
  ]);
  assert.equal(totalMinutes(segments), (end.getTime() - start.getTime()) / 60000);
});

test("fall-back night records the repeated hour once per elapsed minute", () => {
  // 2026-11-01 repeats the 1am hour in New York.
  const start = new Date("2026-10-31T23:30:00-04:00");
  const end = new Date("2026-11-01T01:30:00-05:00");
  const segments = splitTimerRange(start, end);
  assert.deepEqual(segments, [
    { date: "2026-10-31", startTime: "23:30", endTime: "24:00", durationMinutes: 30 },
    { date: "2026-11-01", startTime: "00:00", endTime: "01:30", durationMinutes: 150 },
  ]);
  assert.equal(totalMinutes(segments), (end.getTime() - start.getTime()) / 60000);
});

test("a run spanning three business days yields one row per day", () => {
  const start = new Date("2026-06-01T22:00:00-04:00");
  const end = new Date("2026-06-03T01:00:00-04:00");
  const segments = splitTimerRange(start, end);
  assert.deepEqual(
    segments.map((segment) => segment.date),
    ["2026-06-01", "2026-06-02", "2026-06-03"],
  );
  assert.equal(segments[1].durationMinutes, 24 * 60);
  assert.equal(totalMinutes(segments), 27 * 60);
});

test("a sub-minute run is stored as a single one-minute entry", () => {
  const start = new Date("2026-06-01T09:00:10-04:00");
  const end = new Date("2026-06-01T09:00:40-04:00");
  const segments = splitTimerRange(start, end);
  assert.deepEqual(segments, [
    { date: "2026-06-01", startTime: "09:00", endTime: "09:01", durationMinutes: 1 },
  ]);
});

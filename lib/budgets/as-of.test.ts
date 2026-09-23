import assert from "node:assert/strict";
import test from "node:test";
import { asOfBounds, asOfCutoff, cappedUsageWindow, grantBusinessDate, netBalanceAsOf } from "./as-of";

test("the cutoff is midnight after the as-of day in the business timezone", () => {
  // Eastern Daylight Time: midnight in New York is 04:00 UTC.
  assert.equal(asOfCutoff("2026-06-30").toISOString(), "2026-07-01T04:00:00.000Z");
  // Eastern Standard Time: midnight in New York is 05:00 UTC.
  assert.equal(asOfCutoff("2026-01-31").toISOString(), "2026-02-01T05:00:00.000Z");
});

test("the cutoff crosses month and year boundaries", () => {
  assert.equal(asOfCutoff("2026-12-31", "UTC").toISOString(), "2027-01-01T00:00:00.000Z");
  assert.equal(asOfCutoff("2024-02-28", "UTC").toISOString(), "2024-02-29T00:00:00.000Z");
});

test("a malformed as-of date is rejected", () => {
  assert.throws(() => asOfCutoff("2026-6-1"), /Invalid as-of date/);
  assert.throws(() => cappedUsageWindow("2026-06-01", "2026-06-30", "nope"), /Invalid as-of date/);
});

test("query bounds pair the grant instant with the plain entry date", () => {
  const bounds = asOfBounds("2026-06-15");
  assert.equal(bounds.entryDateAtMost, "2026-06-15");
  assert.equal(bounds.grantEffectiveBefore.toISOString(), "2026-06-16T04:00:00.000Z");
});

test("a grant lands on its business date, not its UTC date", () => {
  // 21:00 in New York is already the next day in UTC.
  assert.equal(grantBusinessDate(new Date("2026-06-15T21:00:00-04:00")), "2026-06-15");
  assert.equal(grantBusinessDate(new Date("2026-06-15T21:00:00-04:00"), "UTC"), "2026-06-16");
});

test("a usage window is capped at the as-of date inside an open period", () => {
  assert.deepEqual(cappedUsageWindow("2026-06-01", "2026-06-30", "2026-06-15"), {
    from: "2026-06-01",
    to: "2026-06-15",
  });
});

test("a usage window keeps the full period once the period has closed", () => {
  assert.deepEqual(cappedUsageWindow("2026-06-01", "2026-06-30", "2026-08-02"), {
    from: "2026-06-01",
    to: "2026-06-30",
  });
});

test("the as-of balance counts grants and usage on or before the date", () => {
  const grants = [
    { effectiveAt: new Date("2026-06-01T12:00:00-04:00"), hours: 40 },
    { effectiveAt: new Date("2026-06-10T12:00:00-04:00"), hours: 20 },
  ];
  const usage = [
    { date: "2026-06-02", durationMinutes: 120 },
    { date: "2026-06-11", durationMinutes: 60 },
  ];
  assert.equal(netBalanceAsOf(grants, usage, "2026-06-15"), 57);
});

test("activity after the as-of date does not move the balance", () => {
  const grants = [
    { effectiveAt: new Date("2026-06-01T12:00:00-04:00"), hours: 40 },
    { effectiveAt: new Date("2026-07-01T12:00:00-04:00"), hours: 40 },
  ];
  const usage = [
    { date: "2026-06-02", durationMinutes: 120 },
    { date: "2026-06-30", durationMinutes: 600 },
    { date: "2026-07-05", durationMinutes: 600 },
  ];
  // 40h granted less 12h logged through June.
  assert.equal(netBalanceAsOf(grants, usage, "2026-06-30"), 28);
  // Extending the window pulls the later grant and usage back in.
  assert.equal(netBalanceAsOf(grants, usage, "2026-07-31"), 58);
});

test("a grant late on the as-of day still counts, the next morning does not", () => {
  const grants = [{ effectiveAt: new Date("2026-06-15T23:30:00-04:00"), hours: 10 }];
  assert.equal(netBalanceAsOf(grants, [], "2026-06-15"), 10);

  const nextMorning = [{ effectiveAt: new Date("2026-06-16T00:30:00-04:00"), hours: 10 }];
  assert.equal(netBalanceAsOf(nextMorning, [], "2026-06-15"), 0);
});

test("a retainer replenishment inside the window raises the as-of balance", () => {
  const grants = [
    { effectiveAt: new Date("2026-05-01T09:00:00-04:00"), hours: 30 },
    { effectiveAt: new Date("2026-06-01T09:00:00-04:00"), hours: 30 },
  ];
  const usage = [
    { date: "2026-05-20", durationMinutes: 1200 },
    { date: "2026-06-03", durationMinutes: 300 },
  ];
  assert.equal(netBalanceAsOf(grants, usage, "2026-05-31"), 10);
  assert.equal(netBalanceAsOf(grants, usage, "2026-06-10"), 35);
});

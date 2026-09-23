import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBurndownPoints,
  burndownDays,
  enumerateDays,
  projectZeroDate,
  retainerBurndownPoints,
} from "./burndown";
import { netBalanceAsOf, type GrantEvent, type UsageEvent } from "@/lib/budgets/as-of";
import { indexUsage, type RetainerGrant, type RetainerTerms } from "@/lib/budgets/retainer-balance";

function day(date: string, usedHours = 0, grantedHours = 0) {
  return { date, usedHours, grantedHours };
}

/**
 * Mirrors what `burndownSeries` composes after its queries return, so the
 * series behaviour can be asserted without a database.
 */
function seriesFor(from: string, to: string, grants: GrantEvent[], usage: UsageEvent[]) {
  return buildBurndownPoints(
    burndownDays(from, to, grants, usage),
    netBalanceAsOf(grants, usage, to),
  );
}

function grantAt(date: string, hours: number): GrantEvent {
  return { effectiveAt: new Date(`${date}T09:00:00-04:00`), hours };
}

function usageOn(date: string, hours: number): UsageEvent {
  return { date, durationMinutes: hours * 60 };
}

test("a range enumerates every inclusive day", () => {
  assert.deepEqual(enumerateDays("2026-02-27", "2026-03-02"), [
    "2026-02-27",
    "2026-02-28",
    "2026-03-01",
    "2026-03-02",
  ]);
  assert.deepEqual(enumerateDays("2026-03-02", "2026-03-02"), ["2026-03-02"]);
  assert.deepEqual(enumerateDays("2026-03-03", "2026-03-02"), []);
});

test("the series ends on the account's current remaining hours", () => {
  const points = buildBurndownPoints(
    [day("2026-03-01", 2), day("2026-03-02", 3), day("2026-03-03", 1)],
    34,
  );
  assert.equal(points.at(-1)?.remaining, 34);
  assert.equal(points.at(-1)?.date, "2026-03-03");
});

test("usage before the window is carried into the opening balance", () => {
  // 6h burned inside the window against a 34h closing balance means the window
  // opened at 40h, even though the grant itself predates the range.
  const points = buildBurndownPoints(
    [day("2026-03-01", 2), day("2026-03-02", 3), day("2026-03-03", 1)],
    34,
  );
  assert.deepEqual(points, [
    { date: "2026-03-01", remaining: 38 },
    { date: "2026-03-02", remaining: 35 },
    { date: "2026-03-03", remaining: 34 },
  ]);
});

test("a grant inside the window raises the balance on its effective day", () => {
  const points = buildBurndownPoints(
    [day("2026-03-01", 4), day("2026-03-02", 0, 20), day("2026-03-03", 6)],
    20,
  );
  assert.deepEqual(points, [
    { date: "2026-03-01", remaining: 6 },
    { date: "2026-03-02", remaining: 26 },
    { date: "2026-03-03", remaining: 20 },
  ]);
});

test("a window with no activity holds the current balance flat", () => {
  const points = buildBurndownPoints([day("2026-03-01"), day("2026-03-02")], 12.5);
  assert.deepEqual(points, [
    { date: "2026-03-01", remaining: 12.5 },
    { date: "2026-03-02", remaining: 12.5 },
  ]);
});

test("an overdrawn balance stays negative rather than clamping", () => {
  const points = buildBurndownPoints([day("2026-03-01", 5), day("2026-03-02", 5)], -4);
  assert.deepEqual(points, [
    { date: "2026-03-01", remaining: 1 },
    { date: "2026-03-02", remaining: -4 },
  ]);
});

test("fractional usage rounds to two decimals without drifting off the balance", () => {
  const points = buildBurndownPoints(
    [day("2026-03-01", 0.1), day("2026-03-02", 0.2), day("2026-03-03", 0.1)],
    9.6,
  );
  assert.deepEqual(points.map((point) => point.remaining), [9.9, 9.7, 9.6]);
});

test("an empty window produces no points", () => {
  assert.deepEqual(buildBurndownPoints([], 10), []);
});

test("a zero-budget projection is withheld", () => {
  assert.equal(projectZeroDate("2026-03-03", 10, 0), null);
  assert.equal(projectZeroDate("2026-03-03", 0, 2), null);
});

test("a projection rounds up to the day the budget runs out", () => {
  assert.equal(projectZeroDate("2026-03-03", 10, 2), "2026-03-08");
  assert.equal(projectZeroDate("2026-03-03", 10, 3), "2026-03-07");
});

test("grants before the window sit in the opening balance, not on a day", () => {
  const days = burndownDays("2026-06-10", "2026-06-12", [grantAt("2026-06-01", 40)], []);
  assert.deepEqual(days.map((entry) => entry.grantedHours), [0, 0, 0]);
});

test("a grant inside the window lands on its business date", () => {
  const days = burndownDays("2026-06-10", "2026-06-12", [grantAt("2026-06-11", 20)], []);
  assert.deepEqual(days, [
    { date: "2026-06-10", grantedHours: 0, usedHours: 0 },
    { date: "2026-06-11", grantedHours: 20, usedHours: 0 },
    { date: "2026-06-12", grantedHours: 0, usedHours: 0 },
  ]);
});

test("a grant effective after the window is excluded from the days", () => {
  const days = burndownDays("2026-06-10", "2026-06-12", [grantAt("2026-06-20", 20)], []);
  assert.deepEqual(days.map((entry) => entry.grantedHours), [0, 0, 0]);
});

test("a grant late on the closing day still steps the series up", () => {
  const lateGrant = { effectiveAt: new Date("2026-06-12T23:45:00-04:00"), hours: 5 };
  const days = burndownDays("2026-06-11", "2026-06-12", [lateGrant], []);
  assert.deepEqual(days.map((entry) => entry.grantedHours), [0, 5]);
});

test("usage outside the window is not bucketed onto any day", () => {
  const usage = [usageOn("2026-06-09", 3), usageOn("2026-06-11", 2), usageOn("2026-06-20", 4)];
  const days = burndownDays("2026-06-10", "2026-06-12", [], usage);
  assert.deepEqual(days.map((entry) => entry.usedHours), [0, 2, 0]);
});

test("a retainer replenishment inside the window shows as a step up", () => {
  const grants = [grantAt("2026-05-01", 30), grantAt("2026-06-01", 30)];
  const usage = [usageOn("2026-05-30", 4), usageOn("2026-06-02", 6)];
  const points = seriesFor("2026-05-30", "2026-06-02", grants, usage);
  assert.deepEqual(points, [
    { date: "2026-05-30", remaining: 26 },
    { date: "2026-05-31", remaining: 26 },
    { date: "2026-06-01", remaining: 56 },
    { date: "2026-06-02", remaining: 50 },
  ]);
});

test("activity after the closing date does not change a historical series", () => {
  const grants = [grantAt("2026-05-01", 30)];
  const usage = [usageOn("2026-05-10", 4), usageOn("2026-05-11", 6)];
  const historical = seriesFor("2026-05-10", "2026-05-11", grants, usage);

  const withLaterActivity = seriesFor("2026-05-10", "2026-05-11", [...grants, grantAt("2026-06-01", 30)], [
    ...usage,
    usageOn("2026-05-20", 8),
    usageOn("2026-06-02", 5),
  ]);

  assert.deepEqual(historical, [
    { date: "2026-05-10", remaining: 26 },
    { date: "2026-05-11", remaining: 20 },
  ]);
  assert.deepEqual(withLaterActivity, historical);
});

test("extending the window to today reflects the newer activity", () => {
  const grants = [grantAt("2026-05-01", 30), grantAt("2026-06-01", 30)];
  const usage = [usageOn("2026-05-10", 4), usageOn("2026-06-02", 5)];
  const points = seriesFor("2026-05-10", "2026-06-02", grants, usage);
  assert.equal(points.at(-1)?.remaining, 51);
});

function retainerTerms(rolloverPolicy: string, rolloverCapHours: number | null = null): RetainerTerms {
  return { rolloverPolicy, rolloverCapHours, timezone: "America/New_York" };
}

function periodGrant(periodStart: string, hours: number, effectiveAt: string): RetainerGrant {
  return { periodStart, hours, effectiveAt: new Date(effectiveAt) };
}

const RETAINER_GRANTS = [
  periodGrant("2026-05", 30, "2026-05-01T09:00:00-04:00"),
  periodGrant("2026-06", 30, "2026-06-01T09:00:00-04:00"),
];
const RETAINER_USAGE = indexUsage([
  usageOn("2026-05-20", 10),
  usageOn("2026-05-30", 4),
  usageOn("2026-06-02", 6),
]);

test("an expiring retainer series restarts at the replenishment", () => {
  const points = retainerBurndownPoints(
    "2026-05-30",
    "2026-06-02",
    retainerTerms("expire"),
    RETAINER_GRANTS,
    RETAINER_USAGE,
  );
  // May's days must not borrow June's grant: 30h less the 14h logged in May.
  assert.deepEqual(points, [
    { date: "2026-05-30", remaining: 16 },
    { date: "2026-05-31", remaining: 16 },
    { date: "2026-06-01", remaining: 30 },
    { date: "2026-06-02", remaining: 24 },
  ]);
});

test("a capped rollover series carries only the capped hours across the boundary", () => {
  const points = retainerBurndownPoints(
    "2026-05-30",
    "2026-06-02",
    retainerTerms("accumulate", 2),
    RETAINER_GRANTS,
    RETAINER_USAGE,
  );
  assert.deepEqual(points, [
    { date: "2026-05-30", remaining: 16 },
    { date: "2026-05-31", remaining: 16 },
    { date: "2026-06-01", remaining: 32 },
    { date: "2026-06-02", remaining: 26 },
  ]);
});

test("a window longer than a period values each day against its own period", () => {
  const points = retainerBurndownPoints(
    "2026-05-06",
    "2026-06-02",
    retainerTerms("accumulate"),
    RETAINER_GRANTS,
    RETAINER_USAGE,
  );
  assert.equal(points.length, 28);
  assert.equal(points[0].remaining, 30);
  assert.equal(points.find((point) => point.date === "2026-05-20")?.remaining, 20);
  assert.equal(points.find((point) => point.date === "2026-05-31")?.remaining, 16);
  assert.equal(points.find((point) => point.date === "2026-06-01")?.remaining, 46);
  assert.equal(points.at(-1)?.remaining, 40);
});

test("a retainer series applies the retainer's timezone to the grant cutoff", () => {
  // The grant lands at 02:30 UTC, which is still the previous day in Pacific.
  const grants = [periodGrant("2026-06", 30, "2026-06-05T02:30:00Z")];
  const usage = indexUsage([usageOn("2026-06-03", 2)]);
  const inUtc = retainerBurndownPoints(
    "2026-06-04",
    "2026-06-05",
    { rolloverPolicy: "expire", rolloverCapHours: null, timezone: "UTC" },
    grants,
    usage,
  );
  const inPacific = retainerBurndownPoints(
    "2026-06-04",
    "2026-06-05",
    { rolloverPolicy: "expire", rolloverCapHours: null, timezone: "America/Los_Angeles" },
    grants,
    usage,
  );

  assert.deepEqual(inUtc.map((point) => point.remaining), [-2, 28]);
  assert.deepEqual(inPacific.map((point) => point.remaining), [28, 28]);
});

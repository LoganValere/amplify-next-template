import assert from "node:assert/strict";
import test from "node:test";
import { grantDateForMonth, isReplenishDay, periodStartKey } from "./period";

test("February 31-style dates land on last day of month", () => {
  const date = grantDateForMonth(2026, 1, 31, "UTC");
  assert.equal(date.getUTCDate(), 28);
});

test("period key is year-month of grant", () => {
  assert.equal(periodStartKey(2026, 1), "2026-02");
});

test("replenish on the 1st fires only that day", () => {
  const first = isReplenishDay(new Date("2026-03-01T15:00:00Z"), 1, "UTC");
  const second = isReplenishDay(new Date("2026-03-02T15:00:00Z"), 1, "UTC");
  assert.equal(first.due, true);
  assert.equal(first.periodStart, "2026-03");
  assert.equal(second.due, false);
});

test("day 31 in April grants on the 30th only", () => {
  const thirtieth = isReplenishDay(new Date("2026-04-30T15:00:00Z"), 31, "UTC");
  const firstMay = isReplenishDay(new Date("2026-05-01T15:00:00Z"), 31, "UTC");
  assert.equal(thirtieth.due, true);
  assert.equal(thirtieth.periodStart, "2026-04");
  assert.equal(firstMay.due, false);
});

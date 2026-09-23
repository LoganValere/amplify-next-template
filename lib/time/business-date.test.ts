import assert from "node:assert/strict";
import test from "node:test";
import { businessDateRange, businessToday, shiftBusinessDate } from "./business-date";

test("business date follows the business timezone, not UTC", () => {
  // 21:30 in New York is already the next day in UTC.
  assert.equal(businessToday(new Date("2026-03-10T21:30:00-04:00")), "2026-03-10");
});

test("shifting a date crosses month and year boundaries", () => {
  assert.equal(shiftBusinessDate("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftBusinessDate("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftBusinessDate("2024-02-28", 1), "2024-02-29");
});

test("shifting by zero days returns the same date", () => {
  assert.equal(shiftBusinessDate("2026-06-15", 0), "2026-06-15");
});

test("a malformed date is rejected", () => {
  assert.throws(() => shiftBusinessDate("not-a-date", 1), /Invalid business date/);
});

test("a trailing range is inclusive of today", () => {
  const now = new Date("2026-03-10T09:00:00-04:00");
  assert.deepEqual(businessDateRange(28, now), { from: "2026-02-11", to: "2026-03-10" });
  assert.deepEqual(businessDateRange(1, now), { from: "2026-03-10", to: "2026-03-10" });
});

test("a non-positive trailing range is rejected", () => {
  assert.throws(() => businessDateRange(0), /positive integer/);
  assert.throws(() => businessDateRange(-5), /positive integer/);
});

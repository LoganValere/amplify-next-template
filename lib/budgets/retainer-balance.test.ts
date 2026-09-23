import assert from "node:assert/strict";
import test from "node:test";
import {
  indexUsage,
  periodKeyFor,
  retainerBalanceAsOf,
  usageStartFor,
  type RetainerGrant,
  type RetainerTerms,
} from "./retainer-balance";

const EXPIRE: RetainerTerms = {
  rolloverPolicy: "expire",
  rolloverCapHours: null,
  timezone: "America/New_York",
};

function accumulate(capHours: number | null, timezone = "America/New_York"): RetainerTerms {
  return { rolloverPolicy: "accumulate", rolloverCapHours: capHours, timezone };
}

function grantFor(periodStart: string, hours: number, effectiveAt: string): RetainerGrant {
  return { periodStart, hours, effectiveAt: new Date(effectiveAt) };
}

function usageFor(entries: Array<[string, number]>) {
  return indexUsage(entries.map(([date, hours]) => ({ date, durationMinutes: hours * 60 })));
}

/** May and June retainer grants with usage on both sides of the replenishment. */
const MAY_AND_JUNE = [
  grantFor("2026-05", 30, "2026-05-01T09:00:00-04:00"),
  grantFor("2026-06", 30, "2026-06-01T09:00:00-04:00"),
];
const SPANNING_USAGE = usageFor([
  ["2026-05-20", 10],
  ["2026-05-30", 4],
  ["2026-06-02", 6],
]);

function remainingOn(terms: RetainerTerms, asOf: string): number {
  return retainerBalanceAsOf(terms, MAY_AND_JUNE, SPANNING_USAGE, asOf).remainingHours;
}

test("usage totals are summed over an inclusive date range", () => {
  const usage = usageFor([
    ["2026-05-31", 2],
    ["2026-06-01", 3],
    ["2026-06-01", 1],
    ["2026-06-10", 5],
  ]);
  assert.equal(usage.minutesBetween("2026-06-01", "2026-06-10"), 9 * 60);
  assert.equal(usage.minutesBetween("2026-06-01", "2026-06-01"), 4 * 60);
  assert.equal(usage.minutesBetween("2026-06-02", "2026-06-09"), 0);
  assert.equal(usage.minutesBetween("2026-06-10", "2026-06-01"), 0);
  assert.equal(usage.minutesBetween("2026-01-01", "2026-12-31"), 11 * 60);
});

test("a business date resolves to its calendar period", () => {
  assert.equal(periodKeyFor("2026-06-01"), "2026-06");
  assert.equal(periodKeyFor("2026-12-31"), "2026-12");
});

test("an expiring retainer drops the closed period's unused hours at the boundary", () => {
  // Through May the period holds 30h less the 14h logged in it.
  assert.equal(remainingOn(EXPIRE, "2026-05-30"), 16);
  assert.equal(remainingOn(EXPIRE, "2026-05-31"), 16);
  // June opens on its own grant alone: the 16h left in May expired.
  assert.equal(remainingOn(EXPIRE, "2026-06-01"), 30);
  assert.equal(remainingOn(EXPIRE, "2026-06-02"), 24);
});

test("accumulated rollover carries the closed period's unused hours forward", () => {
  assert.equal(remainingOn(accumulate(null), "2026-05-31"), 16);
  assert.equal(remainingOn(accumulate(null), "2026-06-01"), 46);
  assert.equal(remainingOn(accumulate(null), "2026-06-02"), 40);
});

test("a rollover cap limits what crosses the period boundary", () => {
  // 16h were unused in May but only 2h may carry.
  assert.equal(remainingOn(accumulate(2), "2026-05-31"), 16);
  assert.equal(remainingOn(accumulate(2), "2026-06-01"), 32);
  assert.equal(remainingOn(accumulate(2), "2026-06-02"), 26);
});

test("an overdrawn period carries nothing forward instead of a negative", () => {
  const overdrawn = usageFor([["2026-05-10", 50]]);
  const balance = retainerBalanceAsOf(accumulate(null), MAY_AND_JUNE, overdrawn, "2026-06-01");
  assert.equal(balance.grantedHours, 30);
  assert.equal(balance.remainingHours, 30);
});

test("the cap applies to the total carry, not to each period", () => {
  const grants = [
    grantFor("2026-04", 30, "2026-04-01T09:00:00-04:00"),
    grantFor("2026-05", 30, "2026-05-01T09:00:00-04:00"),
    grantFor("2026-06", 30, "2026-06-01T09:00:00-04:00"),
  ];
  // 20h unused in April plus 25h unused in May is 45h of carry, capped at 10h.
  const usage = usageFor([
    ["2026-04-15", 10],
    ["2026-05-15", 5],
  ]);
  assert.equal(
    retainerBalanceAsOf(accumulate(10), grants, usage, "2026-06-01").remainingHours,
    40,
  );
  assert.equal(
    retainerBalanceAsOf(accumulate(null), grants, usage, "2026-06-01").remainingHours,
    75,
  );
});

test("a grant effective later in the window is invisible on earlier days", () => {
  // The June grant is effective 2026-06-01, so May's days cannot see it.
  const balance = retainerBalanceAsOf(EXPIRE, MAY_AND_JUNE, SPANNING_USAGE, "2026-05-31");
  assert.equal(balance.grantedHours, 30);
  assert.equal(balance.periodStart, "2026-05");
});

test("usage logged after the as-of date does not reduce the balance", () => {
  const usage = usageFor([
    ["2026-06-02", 6],
    ["2026-06-20", 9],
  ]);
  assert.equal(retainerBalanceAsOf(EXPIRE, MAY_AND_JUNE, usage, "2026-06-02").remainingHours, 24);
  assert.equal(retainerBalanceAsOf(EXPIRE, MAY_AND_JUNE, usage, "2026-06-30").remainingHours, 15);
});

test("the cutoff for a grant follows the retainer's own timezone", () => {
  // 02:30 UTC on 2026-06-05 is still 2026-06-04 on the US west coast.
  const grants = [grantFor("2026-06", 30, "2026-06-05T02:30:00Z")];
  const usage = usageFor([["2026-06-03", 2]]);
  const utc: RetainerTerms = { rolloverPolicy: "expire", rolloverCapHours: null, timezone: "UTC" };
  const pacific: RetainerTerms = {
    rolloverPolicy: "expire",
    rolloverCapHours: null,
    timezone: "America/Los_Angeles",
  };

  assert.equal(retainerBalanceAsOf(utc, grants, usage, "2026-06-04").remainingHours, -2);
  assert.equal(retainerBalanceAsOf(pacific, grants, usage, "2026-06-04").remainingHours, 28);
  // By the next day both timezones agree the grant has landed.
  assert.equal(retainerBalanceAsOf(utc, grants, usage, "2026-06-05").remainingHours, 28);
});

test("the live balance ignores the cutoff and counts the whole period", () => {
  const grants = [grantFor("2026-06", 30, "2026-06-20T09:00:00-04:00")];
  const usage = usageFor([
    ["2026-06-03", 2],
    ["2026-06-28", 5],
  ]);
  assert.equal(retainerBalanceAsOf(EXPIRE, grants, usage, "2026-06-04").remainingHours, -2);
  assert.equal(
    retainerBalanceAsOf(EXPIRE, grants, usage, "2026-06-04", { enforceCutoff: false })
      .remainingHours,
    23,
  );
});

test("an expiring retainer only needs the current period's usage", () => {
  assert.equal(usageStartFor(EXPIRE, MAY_AND_JUNE, "2026-06-15"), "2026-06-01");
});

test("accumulated rollover reaches back to the earliest granted period", () => {
  assert.equal(usageStartFor(accumulate(null), MAY_AND_JUNE, "2026-06-15"), "2026-05-01");
  // Nothing was granted before May, so May's own days start at May.
  assert.equal(usageStartFor(accumulate(null), MAY_AND_JUNE, "2026-05-15"), "2026-05-01");
});

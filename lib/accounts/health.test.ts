import assert from "node:assert/strict";
import test from "node:test";
import { accountHealth, budgetUsageRatio } from "./health";

function balance(grantedHours: number, usedHours: number) {
  return { balance: { grantedHours, usedHours, remainingHours: grantedHours - usedHours } };
}

test("an untrackable account is never scored on budgets", () => {
  assert.deepEqual(accountHealth({ trackable: false, balances: [balance(100, 99)] }), {
    label: "Not trackable",
    tone: "neutral",
  });
});

test("an account without categories reports no budgets", () => {
  assert.equal(accountHealth({ trackable: true, balances: [] }).label, "No budgets");
});

test("categories with no grants and no usage are not treated as exhausted", () => {
  const health = accountHealth({ trackable: true, balances: [balance(0, 0), balance(0, 0)] });
  assert.deepEqual(health, { label: "No funded budgets", tone: "neutral" });
});

test("a depleted or overdrawn category needs attention", () => {
  assert.equal(accountHealth({ trackable: true, balances: [balance(10, 10)] }).tone, "danger");
  assert.equal(accountHealth({ trackable: true, balances: [balance(10, 12)] }).tone, "danger");
});

test("usage at the warning threshold is flagged before the budget runs out", () => {
  assert.equal(accountHealth({ trackable: true, balances: [balance(100, 80)] }).label, "Watch");
  assert.equal(accountHealth({ trackable: true, balances: [balance(100, 79)] }).label, "Healthy");
});

test("the worst category drives the overall health", () => {
  const health = accountHealth({ trackable: true, balances: [balance(100, 5), balance(10, 10)] });
  assert.equal(health.label, "Needs attention");
});

test("usage ratio is unavailable without a recorded grant", () => {
  assert.equal(budgetUsageRatio({ grantedHours: 0, usedHours: 4, remainingHours: -4 }), null);
  assert.equal(budgetUsageRatio({ grantedHours: 40, usedHours: 10, remainingHours: 30 }), 0.25);
});

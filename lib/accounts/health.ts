export type HealthTone = "neutral" | "success" | "warning" | "danger";

export type AccountHealth = {
  label: string;
  tone: HealthTone;
};

export type CategoryBalanceSummary = {
  remainingHours: number;
  grantedHours: number;
  usedHours: number;
};

export type AccountHealthInput = {
  trackable: boolean;
  balances: Array<{ balance: CategoryBalanceSummary }>;
};

/** Usage at or above this share of the granted budget is surfaced as a warning. */
export const BUDGET_WARNING_RATIO = 0.8;

function isFunded(balance: CategoryBalanceSummary): boolean {
  return balance.grantedHours !== 0 || balance.usedHours !== 0 || balance.remainingHours !== 0;
}

/**
 * Share of the granted budget already consumed, or `null` when no grant is
 * recorded and a percentage would be fabricated.
 */
export function budgetUsageRatio(balance: CategoryBalanceSummary): number | null {
  if (balance.grantedHours <= 0) return null;
  return balance.usedHours / balance.grantedHours;
}

export function accountHealth(account: AccountHealthInput): AccountHealth {
  if (!account.trackable) return { label: "Not trackable", tone: "neutral" };
  if (account.balances.length === 0) return { label: "No budgets", tone: "neutral" };

  const funded = account.balances.filter(({ balance }) => isFunded(balance));
  if (funded.length === 0) return { label: "No funded budgets", tone: "neutral" };
  if (funded.some(({ balance }) => balance.remainingHours <= 0)) {
    return { label: "Needs attention", tone: "danger" };
  }
  if (funded.some(({ balance }) => (budgetUsageRatio(balance) ?? 0) >= BUDGET_WARNING_RATIO)) {
    return { label: "Watch", tone: "warning" };
  }
  return { label: "Healthy", tone: "success" };
}

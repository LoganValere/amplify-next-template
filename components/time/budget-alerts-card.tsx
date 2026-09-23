"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { TimeAccount } from "./types";

type Alert = { account: string; category: string; usedHours: number; grantedHours: number; remainingHours: number };

/**
 * Accounts expose a balance row for every active category, so a zero balance is
 * usually structural (no grant, no usage) rather than a problem. Only buckets
 * with real usage that has reached or passed the granted hours are alerts.
 */
export function deriveBudgetAlerts(accounts: TimeAccount[]): Alert[] {
  return accounts
    .flatMap((account) =>
      account.balances
        .filter((row) => row.balance.usedHours > 0 && row.balance.remainingHours <= 0)
        .map((row) => ({
          account: account.name,
          category: row.category.name,
          usedHours: row.balance.usedHours,
          grantedHours: row.balance.grantedHours,
          remainingHours: row.balance.remainingHours,
        })),
    )
    .sort((a, b) => a.remainingHours - b.remainingHours);
}

export function BudgetAlertsCard({ accounts }: { accounts: TimeAccount[] }) {
  const alerts = deriveBudgetAlerts(accounts);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">Budget alerts</h2>
      </CardHeader>
      <CardContent>
        {alerts.length ? (
          <ul className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <li key={`${alert.account}-${alert.category}`}>
                <p className="text-sm font-medium">{alert.account}</p>
                <p className="text-xs text-valere-danger">
                  {alert.category} · {alert.usedHours.toFixed(2)}h used of {alert.grantedHours.toFixed(2)}h granted
                  {alert.remainingHours < 0 ? ` · ${Math.abs(alert.remainingHours).toFixed(2)}h over` : " · fully used"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-valere-muted">No account bucket has used up its granted hours.</p>
        )}
        <Link href="/accounts" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
          Review accounts
        </Link>
      </CardContent>
    </Card>
  );
}

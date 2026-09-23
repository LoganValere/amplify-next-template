"use client";

import { useEffect, useState } from "react";

type Balance = {
  category: { id: string; name: string };
  balance: { remainingHours: number; usedHours: number; mode: string; nextRefillDate: string | null };
};

type Account = {
  id: string;
  name: string;
  status: string;
  trackable: boolean;
  accountManager: string | null;
  balances: Balance[];
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    void fetch("/api/accounts")
      .then((res) => res.json())
      .then((payload: { accounts: Account[] }) => setAccounts(payload.accounts ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Accounts</h1>
      <p className="text-sm text-valere-muted">Synced from Monday Accounts. Time is logged to the account.</p>
      <div className="grid gap-4">
        {accounts.length === 0 ? (
          <p className="text-valere-muted">No accounts yet. Admins can run Monday sync from Admin.</p>
        ) : (
          accounts.map((account) => (
            <section key={account.id} className="rounded-lg border border-valere-border p-4">
              <div className="flex justify-between gap-4">
                <div>
                  <h2 className="font-medium">{account.name}</h2>
                  <p className="text-xs text-valere-muted">
                    {account.status} · AM {account.accountManager ?? "—"}
                  </p>
                </div>
                <span className="text-xs text-valere-muted">{account.trackable ? "Trackable" : "Archived"}</span>
              </div>
              <div className="mt-3 grid sm:grid-cols-3 gap-2 text-sm">
                {account.balances.map((row) => (
                  <div key={row.category.id} className="rounded bg-black/40 p-2">
                    <p className="text-valere-muted text-xs">{row.category.name}</p>
                    <p>{row.balance.remainingHours.toFixed(2)}h left</p>
                    <p className="text-xs text-valere-muted">
                      {row.balance.mode}
                      {row.balance.nextRefillDate ? ` · refill ${row.balance.nextRefillDate}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

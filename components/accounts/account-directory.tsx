"use client";

import { useMemo, useState } from "react";
import { AccountHealthBadge, BudgetHealth } from "./account-health";
import type { AccountHealthRecord } from "./types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, TableCell, TableHead, TableRow } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form-field";

export function AccountDirectory({ accounts }: { accounts: AccountHealthRecord[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [manager, setManager] = useState("");
  const [trackability, setTrackability] = useState("");

  const statuses = useMemo(() => [...new Set(accounts.map((account) => account.status))].sort(), [accounts]);
  const managers = useMemo(
    () => [...new Set(accounts.map((account) => account.accountManager).filter((value): value is string => Boolean(value)))].sort(),
    [accounts],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return accounts.filter((account) => {
      const matchesQuery =
        !normalized ||
        account.name.toLowerCase().includes(normalized) ||
        account.accountManager?.toLowerCase().includes(normalized) ||
        account.balances.some((row) => row.category.name.toLowerCase().includes(normalized));
      return (
        matchesQuery &&
        (!status || account.status === status) &&
        (!manager || account.accountManager === manager) &&
        (!trackability || String(account.trackable) === trackability)
      );
    });
  }, [accounts, manager, query, status, trackability]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-xl border bg-white p-4 shadow-editorial sm:grid-cols-2 xl:grid-cols-4">
        <Input
          id="account-search"
          label="Search"
          type="search"
          placeholder="Account, manager, or category"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select id="account-status" label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
        </Select>
        <Select id="account-manager" label="Account manager" value={manager} onChange={(event) => setManager(event.target.value)}>
          <option value="">All managers</option>
          {managers.map((value) => <option key={value} value={value}>{value}</option>)}
        </Select>
        <Select
          id="account-trackability"
          label="Trackability"
          value={trackability}
          onChange={(event) => setTrackability(event.target.value)}
        >
          <option value="">All accounts</option>
          <option value="true">Trackable</option>
          <option value="false">Not trackable</option>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-valere-muted" aria-live="polite">
          Showing {filtered.length} of {accounts.length} accounts
        </p>
        <p className="text-xs text-valere-muted">Account records reflect the latest completed Monday sync.</p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={accounts.length === 0 ? "No accounts available" : "No matching accounts"}
          description={accounts.length === 0 ? "Accounts will appear after they are synced." : "Adjust the search or filters."}
        />
      ) : (
        <>
          <div className="grid gap-4 md:hidden">
            {filtered.map((account) => (
              <Card key={account.id}>
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">{account.name}</h2>
                      <p className="mt-1 text-xs text-valere-muted">{account.accountManager ?? "No account manager"}</p>
                    </div>
                    <AccountHealthBadge account={account} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{account.status}</Badge>
                    <Badge tone={account.trackable ? "accent" : "neutral"}>
                      {account.trackable ? "Trackable" : "Not trackable"}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {account.balances.map((row) => <BudgetHealth key={row.category.id} row={row} />)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden md:block">
            <DataTable>
              <caption className="sr-only">
                {filtered.length} of {accounts.length} accounts with status, manager, and category budget health.
              </caption>
              <thead>
                <tr>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Budget health</TableHead>
                  <TableHead>Overall</TableHead>
                </tr>
              </thead>
              <tbody>
                {filtered.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <p className="font-medium">{account.name}</p>
                      <p className="mt-1 text-xs text-valere-muted">{account.trackable ? "Trackable" : "Not trackable"}</p>
                    </TableCell>
                    <TableCell><Badge>{account.status}</Badge></TableCell>
                    <TableCell>{account.accountManager ?? <span className="text-valere-muted">Unassigned</span>}</TableCell>
                    <TableCell className="min-w-64">
                      <div className="space-y-3">
                        {account.balances.length > 0
                          ? account.balances.map((row) => <BudgetHealth key={row.category.id} row={row} compact />)
                          : <span className="text-valere-muted">No category budgets</span>}
                      </div>
                    </TableCell>
                    <TableCell><AccountHealthBadge account={account} /></TableCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTable>
          </div>
        </>
      )}
    </div>
  );
}

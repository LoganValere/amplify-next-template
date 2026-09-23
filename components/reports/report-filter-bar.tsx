"use client";

import type { ReportAccount, ReportFilters } from "./types";
import { Select, Input } from "@/components/ui/form-field";

const exportLinkClass =
  "inline-flex h-9 items-center rounded-md border bg-white px-3 text-xs font-medium hover:bg-valere-surface";

export function ReportFilterBar({
  filters,
  accounts,
  onChange,
}: {
  filters: ReportFilters;
  accounts: ReportAccount[];
  onChange: (filters: ReportFilters) => void;
}) {
  const categories = accounts.find((account) => account.id === filters.clientId)?.balances ?? [];
  const rangeValid = Boolean(filters.from) && Boolean(filters.to) && filters.from <= filters.to;
  const exportParams = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    scope: filters.clientId ? "account" : "all",
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(filters.categoryId ? { hourCategoryId: filters.categoryId } : {}),
  });

  function update(change: Partial<ReportFilters>) {
    onChange({ ...filters, ...change });
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-editorial">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Input id="report-from" label="From" type="date" value={filters.from} onChange={(event) => update({ from: event.target.value })} />
        <Input id="report-to" label="To" type="date" value={filters.to} onChange={(event) => update({ to: event.target.value })} />
        <Select
          id="report-account"
          label="Account"
          value={filters.clientId}
          hint="Leave on all accounts for a portfolio view."
          onChange={(event) => update({ clientId: event.target.value, categoryId: "" })}
        >
          <option value="">All accounts</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </Select>
        <Select
          id="report-category"
          label="Category"
          value={filters.categoryId}
          disabled={!filters.clientId}
          hint={filters.clientId ? "Required for burndown." : "Select an account first."}
          onChange={(event) => update({ categoryId: event.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((row) => <option key={row.category.id} value={row.category.id}>{row.category.name}</option>)}
        </Select>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-valere-muted">Results refresh automatically when filters change.</p>
        {rangeValid ? (
          <div className="flex gap-2">
            <a className={exportLinkClass} href={`/api/export?${exportParams.toString()}&format=csv`}>
              Export filtered CSV
            </a>
            <a className={exportLinkClass} href={`/api/export?${exportParams.toString()}&format=pdf`}>
              Export filtered PDF
            </a>
          </div>
        ) : (
          <p className="text-xs text-valere-muted">Exports become available once the date range is valid.</p>
        )}
      </div>
    </div>
  );
}

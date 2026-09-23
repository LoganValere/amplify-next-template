"use client";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-field";
import type { TimeAccount } from "./types";

export type LogFilters = { accountId: string; from: string; to: string; query: string };

export const EMPTY_FILTERS: LogFilters = { accountId: "", from: "", to: "", query: "" };

type Props = {
  filters: LogFilters;
  accounts: TimeAccount[];
  onChange: (patch: Partial<LogFilters>) => void;
  onClear: () => void;
};

export function TimeLogFilters({ filters, accounts, onChange, onClear }: Props) {
  const partialRange = Boolean(filters.from) !== Boolean(filters.to);

  return (
    <section
      aria-label="Time log filters"
      className="mb-6 grid gap-4 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <Select
        id="log-account"
        label="Account"
        value={filters.accountId}
        onChange={(event) => onChange({ accountId: event.target.value })}
      >
        <option value="">All accounts</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </Select>
      <Input
        id="log-from"
        label="From"
        type="date"
        value={filters.from}
        max={filters.to || undefined}
        onChange={(event) => onChange({ from: event.target.value })}
        hint={partialRange ? "Set both dates to narrow the server query." : undefined}
      />
      <Input
        id="log-to"
        label="To"
        type="date"
        min={filters.from || undefined}
        value={filters.to}
        onChange={(event) => onChange({ to: event.target.value })}
      />
      <Input
        id="log-search"
        label="Search"
        type="search"
        placeholder="Note, account, person…"
        value={filters.query}
        onChange={(event) => onChange({ query: event.target.value })}
        hint="Searches loaded entries only."
      />
      <div className="flex items-end">
        <Button variant="secondary" className="w-full" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    </section>
  );
}

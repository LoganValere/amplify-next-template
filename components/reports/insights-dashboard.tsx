"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BurndownView } from "./burndown-view";
import { ReportFilterBar } from "./report-filter-bar";
import type { BurndownSeries, HoursReportRow, ReportAccount, ReportFilters } from "./types";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, TableCell, TableHead, TableRow } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock, Skeleton } from "@/components/ui/skeleton";

type LoadedReport = {
  key: string;
  rows: HoursReportRow[];
  series: BurndownSeries | null;
};

function queryKey(filters: ReportFilters): string {
  return [filters.from, filters.to, filters.clientId, filters.categoryId].join("|");
}

function isValidRange(filters: ReportFilters): boolean {
  return Boolean(filters.from) && Boolean(filters.to) && filters.from <= filters.to;
}

export function InsightsDashboard({
  initialFrom,
  initialTo,
  scope,
}: {
  initialFrom: string;
  initialTo: string;
  scope: "self" | "org";
}) {
  const [accounts, setAccounts] = useState<ReportAccount[]>([]);
  const [accountsReady, setAccountsReady] = useState(false);
  const [accountsError, setAccountsError] = useState("");
  const [filters, setFilters] = useState<ReportFilters>({
    from: initialFrom,
    to: initialTo,
    clientId: "",
    categoryId: "",
  });
  const [report, setReport] = useState<LoadedReport | null>(null);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/accounts", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load report filters.");
        return response.json() as Promise<{ accounts: ReportAccount[] }>;
      })
      .then((payload) => setAccounts(payload.accounts ?? []))
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setAccountsError(requestError instanceof Error ? requestError.message : "Unable to load report filters.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setAccountsReady(true);
      });
    return () => controller.abort();
  }, []);

  const activeKey = queryKey(filters);
  const rangeValid = isValidRange(filters);

  useEffect(() => {
    if (!accountsReady) return;
    // Stale numbers must never sit under freshly changed filter labels.
    setReport(null);
    if (!rangeValid) {
      setError("Choose a start date on or before the end date.");
      return;
    }
    setError("");

    const controller = new AbortController();
    const currentRequest = ++requestId.current;
    const timeout = window.setTimeout(() => {
      const hoursParams = new URLSearchParams({
        kind: "hours",
        from: filters.from,
        to: filters.to,
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.categoryId ? { hourCategoryId: filters.categoryId } : {}),
      });
      const burndownParams =
        filters.clientId && filters.categoryId
          ? new URLSearchParams({
              kind: "burndown",
              from: filters.from,
              to: filters.to,
              clientId: filters.clientId,
              hourCategoryId: filters.categoryId,
            })
          : null;

      void Promise.all([
        fetchJson<{ rows: HoursReportRow[] }>(`/api/reports?${hoursParams.toString()}`, controller.signal),
        burndownParams
          ? fetchJson<{ series: BurndownSeries }>(`/api/reports?${burndownParams.toString()}`, controller.signal)
          : Promise.resolve(null),
      ])
        .then(([hoursPayload, burndownPayload]) => {
          if (currentRequest !== requestId.current) return;
          setReport({
            key: activeKey,
            rows: hoursPayload.rows ?? [],
            series: burndownPayload?.series ?? null,
          });
        })
        .catch((requestError: unknown) => {
          if (requestError instanceof DOMException && requestError.name === "AbortError") return;
          if (currentRequest !== requestId.current) return;
          setReport(null);
          setError(requestError instanceof Error ? requestError.message : "Unable to load insights.");
        });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [accountsReady, activeKey, filters, rangeValid]);

  const current = report?.key === activeKey ? report : null;
  const refreshing = !accountsReady || (rangeValid && !error && current === null);
  const burndownSelected = Boolean(filters.clientId && filters.categoryId);

  const metrics = useMemo(() => {
    const rows = current?.rows ?? [];
    return {
      totalHours: rows.reduce((sum, row) => sum + row.hours, 0),
      people: new Set(rows.map((row) => row.person)).size,
      accounts: new Set(rows.map((row) => row.account)).size,
      weeks: new Set(rows.map((row) => row.week)).size,
    };
  }, [current]);

  const scopeNote =
    scope === "self"
      ? "Showing your own logged hours, matching what your exports contain."
      : "Showing organization-wide logged hours.";

  return (
    <div className="space-y-6">
      <ReportFilterBar filters={filters} accounts={accounts} onChange={setFilters} />
      {accountsError ? <Alert tone="warning">{accountsError} Date-only reporting remains available.</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {refreshing ? (
        <LoadingBlock label="Loading summary metrics">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {["hours", "contributors", "accounts", "weeks"].map((key) => (
              <Skeleton key={key} className="h-24 w-full" />
            ))}
          </div>
        </LoadingBlock>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Logged hours" value={current ? `${metrics.totalHours.toFixed(2)}h` : "—"} />
          <Metric label="Contributors" value={current ? String(metrics.people) : "—"} />
          <Metric label="Accounts" value={current ? String(metrics.accounts) : "—"} />
          <Metric label="Weeks represented" value={current ? String(metrics.weeks) : "—"} />
        </div>
      )}

      {burndownSelected ? (
        <BurndownView series={current?.series ?? null} loading={refreshing} />
      ) : (
        <EmptyState
          title="Select an account and category"
          description="Burndown tracks a single category budget, so choose both filters to chart remaining hours."
        />
      )}

      <section aria-labelledby="hours-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="hours-heading" className="font-semibold">Hours by person and week</h2>
            <p className="mt-1 text-xs text-valere-muted">{scopeNote}</p>
          </div>
          {refreshing ? <span className="text-xs text-valere-muted">Refreshing…</span> : null}
        </div>
        {refreshing ? (
          <LoadingBlock label="Loading hours" />
        ) : !current ? (
          <EmptyState
            title="No results to show"
            description={error ? "Adjust the filters and try again." : "Choose a valid date range to load hours."}
          />
        ) : current.rows.length === 0 ? (
          <EmptyState title="No hours in this range" description="Try a broader date range or different filters." />
        ) : (
          <DataTable>
            <caption className="sr-only">
              Logged hours from {filters.from} to {filters.to}, grouped by contributor, account, category, and week.
            </caption>
            <thead>
              <tr>
                <TableHead>Person</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Week</TableHead>
                <TableHead className="text-right">Hours</TableHead>
              </tr>
            </thead>
            <tbody>
              {current.rows.map((row, index) => (
                <TableRow key={`${row.person}-${row.account}-${row.category}-${row.week}-${index}`}>
                  <TableCell className="font-medium">{row.person}</TableCell>
                  <TableCell>{row.account}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.week}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.hours.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </DataTable>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs font-medium text-valere-muted">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(payload?.error ?? payload?.message ?? "Unable to load insights.");
  }
  return response.json() as Promise<T>;
}

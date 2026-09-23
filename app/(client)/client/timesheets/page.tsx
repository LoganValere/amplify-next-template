"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, TableCell, TableHead, TableRow } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingBlock } from "@/components/ui/skeleton";
import { businessDateRange } from "@/lib/time/business-date";

type Entry = {
  id: string;
  date: string;
  durationMinutes: number;
  description: string;
  user: { name: string };
  hourCategory: { name: string };
};

export default function ClientTimesheetsPage() {
  // Resolved once on mount so the default window cannot shift between renders.
  const [range, setRange] = useState(() => businessDateRange(30));
  const { from, to } = range;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const rangeQuery = new URLSearchParams({ from, to }).toString();
  const rangeValid = Boolean(from) && Boolean(to) && from <= to;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void fetch(`/api/time?${rangeQuery}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load timesheets.");
        return response.json() as Promise<{ entries: Entry[] }>;
      })
      .then((payload) => setEntries(payload.entries ?? []))
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load timesheets.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [rangeQuery]);

  return (
    <>
      <PageHeader eyebrow="History" title="Timesheets" description="Review and export time recorded for your account." />
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Input
              id="timesheet-from"
              label="From"
              type="date"
              value={from}
              onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))}
            />
            <Input
              id="timesheet-to"
              label="To"
              type="date"
              value={to}
              onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))}
            />
          </div>
          {rangeValid ? (
            <div className="flex gap-2">
              <a className="inline-flex h-10 items-center rounded-md border px-3 text-sm font-medium hover:bg-valere-surface" href={`/api/export?${rangeQuery}&format=csv`}>Export CSV</a>
              <a className="inline-flex h-10 items-center rounded-md border px-3 text-sm font-medium hover:bg-valere-surface" href={`/api/export?${rangeQuery}&format=pdf`}>Export PDF</a>
            </div>
          ) : (
            <p className="text-xs text-valere-muted">Exports become available once the date range is valid.</p>
          )}
        </CardContent>
      </Card>
      {error ? <Alert className="mb-5" tone="danger">{error}</Alert> : null}
      {loading && entries.length === 0 ? (
        <LoadingBlock label="Loading timesheets" />
      ) : entries.length === 0 ? (
        <EmptyState title="No time in this range" description="Try a broader date range." />
      ) : (
        <DataTable>
          <caption className="sr-only">Time entries from {from} to {to}.</caption>
          <thead><tr><TableHead>Date</TableHead><TableHead>Person</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Hours</TableHead><TableHead>Notes</TableHead></tr></thead>
          <tbody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.date}</TableCell>
                <TableCell>{entry.user.name}</TableCell>
                <TableCell>{entry.hourCategory.name}</TableCell>
                <TableCell className="text-right tabular-nums">{(entry.durationMinutes / 60).toFixed(2)}</TableCell>
                <TableCell className="min-w-48">{entry.description || <span className="text-valere-muted">—</span>}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}

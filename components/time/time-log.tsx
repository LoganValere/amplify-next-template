"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EntryEditor } from "./entry-editor";
import { EntryList, formatHours } from "./entry-list";
import { StaleDataNotice } from "./stale-data-notice";
import { EMPTY_FILTERS, LogFilters, TimeLogFilters } from "./time-log-filters";
import type { TimeEntry } from "./types";
import { ENTRY_LIMIT, sendTimeRequest, useTimeData } from "./use-time-data";

function matchesSearch(entry: TimeEntry, needle: string) {
  if (!needle) return true;
  return [entry.description, entry.client.name, entry.hourCategory.name, entry.user.name].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

export function TimeLog() {
  const [filters, setFilters] = useState<LogFilters>(EMPTY_FILTERS);
  const { data, loading, queryLoading, error, refreshError, refresh } = useTimeData({
    query: { from: filters.from, to: filters.to, clientId: filters.accountId },
  });
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [deleting, setDeleting] = useState<TimeEntry | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Date bounds are only sent to the API as a complete range, so a single-sided
  // bound is still applied here to keep the visible rows consistent.
  const visible = useMemo(() => {
    const needle = filters.query.trim().toLowerCase();
    return data.entries.filter((entry) => {
      if (filters.from && entry.date < filters.from) return false;
      if (filters.to && entry.date > filters.to) return false;
      return matchesSearch(entry, needle);
    });
  }, [data.entries, filters.from, filters.query, filters.to]);

  async function removeEntry() {
    if (!deleting || deletePending) return;
    setDeletePending(true);
    setDeleteError("");
    try {
      await sendTimeRequest(`/api/time?id=${encodeURIComponent(deleting.id)}`, "DELETE");
      if (editing?.id === deleting.id) setEditing(null);
      setDeleting(null);
      await refresh();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Could not delete this entry.");
    } finally {
      setDeletePending(false);
    }
  }

  function closeDeleteDialog() {
    setDeleting(null);
    setDeleteError("");
  }

  function updateFilters(patch: Partial<LogFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  const atLimit = data.entries.length >= ENTRY_LIMIT;
  const hasFilters = Boolean(filters.accountId || filters.from || filters.to || filters.query);

  return (
    <div>
      <PageHeader
        eyebrow="Time"
        title="Time log"
        description={`Review and maintain the entries available to your role. Account and complete date ranges are filtered by the server; up to ${ENTRY_LIMIT} newest matching entries load at a time.`}
      />
      {refreshError ? <StaleDataNotice message={refreshError} onRetry={() => void refresh()} /> : null}
      <TimeLogFilters
        filters={filters}
        accounts={data.accounts}
        onChange={updateFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      {editing ? (
        <div className="mb-6">
          <EntryEditor
            key={editing.id}
            entry={editing}
            categories={data.categories}
            user={data.user}
            onCancel={() => setEditing(null)}
            onSaved={refresh}
          />
        </div>
      ) : null}

      {error ? (
        <Alert tone="danger">
          <p>{error}</p>
          <button type="button" className="mt-2 underline" onClick={() => void refresh()}>
            Try again
          </button>
        </Alert>
      ) : loading || queryLoading ? (
        <div role="status">
          <Skeleton className="h-72" />
          <span className="sr-only">Loading time entries</span>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No entries match these filters" : "No time entries yet"}
          description={
            hasFilters
              ? "Adjust or clear the filters to see more entries."
              : "Saved timer sessions and manual entries will appear here."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p role="status" className="mb-3 text-sm text-valere-muted">
            Showing {visible.length} of {data.entries.length} loaded entries.
            {atLimit
              ? ` Only the newest ${ENTRY_LIMIT} matching entries load — narrow the account or date range to see older work.`
              : ""}
          </p>
          <EntryList entries={visible} onEdit={setEditing} onDelete={setDeleting} />
        </>
      )}

      <ConfirmationDialog
        open={Boolean(deleting)}
        title="Delete time entry?"
        description={
          deleting
            ? `${deleting.date} · ${deleting.client.name} · ${formatHours(deleting.durationMinutes)}. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete entry"
        destructive
        pending={deletePending}
        error={deleteError}
        onClose={closeDeleteDialog}
        onConfirm={() => void removeEntry()}
      />
    </div>
  );
}

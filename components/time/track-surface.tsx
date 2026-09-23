"use client";

import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ManualEntryForm } from "./manual-entry-form";
import { StaleDataNotice } from "./stale-data-notice";
import { TimerPanel } from "./timer-panel";
import { useTimeData } from "./use-time-data";

export function TrackSurface() {
  const { data, loading, error, refreshError, refresh } = useTimeData();

  return (
    <div>
      <PageHeader
        eyebrow="Time"
        title="Track"
        description="Run a live timer or add completed work manually. Timer sessions that cross midnight are split automatically."
      />
      {refreshError ? <StaleDataNotice message={refreshError} onRetry={() => void refresh()} /> : null}
      {loading ? (
        <div role="status" className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <span className="sr-only">Loading time tracking tools</span>
        </div>
      ) : error ? (
        <Alert tone="danger">
          <p>{error}</p>
          <button className="mt-2 underline" type="button" onClick={() => void refresh()}>Try again</button>
        </Alert>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <TimerPanel accounts={data.accounts} timer={data.timer} onChanged={refresh} />
          <ManualEntryForm
            accounts={data.accounts}
            categories={data.categories}
            user={data.user}
            onSaved={refresh}
          />
        </div>
      )}
    </div>
  );
}

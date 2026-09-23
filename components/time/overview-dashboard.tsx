"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { businessToday } from "@/lib/time/business-date";
import { BudgetAlertsCard } from "./budget-alerts-card";
import { MondayStatusCard } from "./monday-status-card";
import { StaleDataNotice } from "./stale-data-notice";
import { useTimeData } from "./use-time-data";

const OVERVIEW_SOURCE = "overview-dashboard";

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(2)}h`;
}

export function OverviewDashboard() {
  const { data, loading, error, refreshError, refresh } = useTimeData({
    includeCategories: false,
    timerSource: OVERVIEW_SOURCE,
  });
  const today = businessToday();
  const todayEntries = data.entries.filter((entry) => entry.date === today);
  const todayMinutes = todayEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const recentEntries = data.entries.slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow="Team portal"
        title="Overview"
        description="A current view of your time, recent work, and account availability."
      />
      {refreshError ? <StaleDataNotice message={refreshError} onRetry={() => void refresh()} /> : null}
      {loading ? (
        <div role="status" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" />
          <span className="sr-only">Loading overview</span>
        </div>
      ) : error ? (
        <Alert tone="danger"><p>{error}</p><button className="mt-2 underline" type="button" onClick={() => void refresh()}>Try again</button></Alert>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <h2 className="font-semibold">Timer status</h2>
              <Badge tone={data.timer ? "success" : "neutral"}>{data.timer ? "Running" : "Stopped"}</Badge>
            </CardHeader>
            <CardContent>
              {data.timer ? (
                <>
                  <p className="text-lg font-semibold">{data.timer.client.name}</p>
                  <p className="mt-1 text-sm text-valere-muted">{data.timer.note || "No note added"}</p>
                  <p className="mt-3 text-xs text-valere-muted">Started {new Date(data.timer.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                </>
              ) : <p className="text-sm text-valere-muted">You have no timer running right now.</p>}
              <Link href="/timer" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">{data.timer ? "Manage timer" : "Start tracking"}</Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="font-semibold">Today</h2></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{formatHours(todayMinutes)}</p>
              <p className="mt-1 text-sm text-valere-muted">
                {todayEntries.length} saved {todayEntries.length === 1 ? "entry" : "entries"} dated {today}. A running
                timer is not counted until you stop it.
              </p>
              <Link href="/entries" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">View time log</Link>
            </CardContent>
          </Card>

          <MondayStatusCard canManage={data.user?.role === "ADMIN"} />

          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <h2 className="font-semibold">Recent entries</h2>
              <Link href="/entries" className="text-sm font-medium underline underline-offset-4">View all</Link>
            </CardHeader>
            <CardContent>
              {recentEntries.length ? (
                <ul className="divide-y">
                  {recentEntries.map((entry) => (
                    <li key={entry.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{entry.client.name}</p>
                        <p className="truncate text-xs text-valere-muted">{entry.date} · {entry.hourCategory.name} · {entry.description || "No note"}</p>
                      </div>
                      <span className="shrink-0 text-sm tabular-nums">{formatHours(entry.durationMinutes)}</span>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState title="No recent entries" description="Your saved time will appear here." />}
            </CardContent>
          </Card>

          <BudgetAlertsCard accounts={data.accounts} />
        </div>
      )}
    </div>
  );
}

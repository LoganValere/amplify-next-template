"use client";

import dynamic from "next/dynamic";
import type { BurndownSeries } from "./types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, TableCell, TableHead, TableRow } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock, Skeleton } from "@/components/ui/skeleton";

const BurndownChart = dynamic(
  () => import("./burndown-chart").then((module) => module.BurndownChart),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full" /> },
);

export function BurndownView({
  series,
  loading = false,
  title = "Budget burndown",
  emptyTitle = "No burndown available",
  emptyDescription = "Choose an account and category with budget history.",
}: {
  series: BurndownSeries | null;
  loading?: boolean;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (loading) {
    return <LoadingBlock label="Loading burndown"><Skeleton className="h-96 w-full" /></LoadingBlock>;
  }
  if (!series || series.points.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const first = series.points[0];
  const last = series.points[series.points.length - 1];
  const chartDescription = `Remaining budget from ${first.date} at ${first.remaining.toFixed(2)} hours to ${last.date} at ${last.remaining.toFixed(2)} hours.`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-valere-muted">
              {series.remainingHours.toFixed(2)}h remaining as of {series.asOf} · {series.velocityPerDay.toFixed(2)}h/day
            </p>
          </div>
          <p className="text-xs text-valere-muted">
            {series.velocityPerDay === 0
              ? "Insufficient recent usage for a projection"
              : `Projected zero: ${series.projectedZeroDate ?? "not within projection"}`}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="hidden sm:block">
          <BurndownChart points={series.points} description={chartDescription} />
        </div>
        <div className="sm:hidden">
          <DataTable>
            <caption className="sr-only">{chartDescription}</caption>
            <thead><tr><TableHead>Date</TableHead><TableHead className="text-right">Remaining</TableHead></tr></thead>
            <tbody>
              {series.points.map((point) => (
                <TableRow key={point.date}>
                  <TableCell>{point.date}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{point.remaining.toFixed(2)}h</TableCell>
                </TableRow>
              ))}
            </tbody>
          </DataTable>
        </div>
      </CardContent>
    </Card>
  );
}

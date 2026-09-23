"use client";

import { useEffect, useState } from "react";
import { BurndownView } from "@/components/reports/burndown-view";
import type { BurndownSeries, ReportAccount } from "@/components/reports/types";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/form-field";
import { businessDateRange } from "@/lib/time/business-date";

export default function ClientBurndownPage() {
  const [account, setAccount] = useState<ReportAccount | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [series, setSeries] = useState<BurndownSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Resolved once on mount so the window cannot shift between renders.
  const [{ from, to }] = useState(() => businessDateRange(60));

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/accounts", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load account categories.");
        return response.json() as Promise<{ accounts: ReportAccount[] }>;
      })
      .then((payload) => {
        const first = payload.accounts?.[0];
        setAccount(first ?? null);
        setCategoryId(first?.balances[0]?.category.id ?? "");
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load account categories.");
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!account || !categoryId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      kind: "burndown",
      from,
      to,
      clientId: account.id,
      hourCategoryId: categoryId,
    });
    void fetch(`/api/reports?${params.toString()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load burndown.");
        return response.json() as Promise<{ series: BurndownSeries }>;
      })
      .then((payload) => setSeries(payload.series ?? null))
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load burndown.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [account, categoryId, from, to]);

  const selected = account?.balances.find((row) => row.category.id === categoryId);

  return (
    <>
      <PageHeader
        eyebrow="Budget"
        title="Burndown"
        description="Track remaining hours and recent usage for your account."
      />
      <div className="mb-5 max-w-sm">
        <Select id="client-burndown-category" label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          {account?.balances.map((row) => <option key={row.category.id} value={row.category.id}>{row.category.name}</option>)}
        </Select>
      </div>
      <p className="text-sm text-valere-muted">
        {selected
          ? `${selected.balance.remainingHours.toFixed(2)}h remaining · ${selected.balance.mode}${
              selected.balance.nextRefillDate ? ` · next refill ${selected.balance.nextRefillDate}` : ""
            }`
          : ""}
      </p>
      {error ? <Alert className="mt-5" tone="danger">{error}</Alert> : null}
      <div className="mt-5"><BurndownView series={series} loading={loading} title="Your budget burndown" /></div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AccountDirectory } from "@/components/accounts/account-directory";
import type { AccountHealthRecord } from "@/components/accounts/types";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingBlock, Skeleton } from "@/components/ui/skeleton";
import { MondayStatusCard } from "@/components/time/monday-status-card";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountHealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/accounts", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load accounts.");
        return response.json() as Promise<{ accounts: AccountHealthRecord[] }>;
      })
      .then((payload) => setAccounts(payload.accounts ?? []))
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load accounts.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Account health"
        description="Review account ownership, tracking status, and category budget consumption from one directory."
      />
      <div className="mb-6 max-w-xl">
        <MondayStatusCard canManage={false} />
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {loading ? (
        <LoadingBlock label="Loading accounts">
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        </LoadingBlock>
      ) : error ? null : <AccountDirectory accounts={accounts} />}
    </>
  );
}

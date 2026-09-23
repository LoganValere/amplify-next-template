"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type MondayState =
  | { kind: "loading" }
  | { kind: "connected"; detail: string; needsAttention: boolean; canManage: boolean }
  | { kind: "not-connected"; canManage: boolean }
  | { kind: "unavailable" };

export function MondayStatusCard({ canManage }: { canManage: boolean }) {
  const [state, setState] = useState<MondayState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    void fetch("/api/monday/status")
      .then(async (response) => {
        if (!active) return;
        if (response.status === 404) {
          setState({ kind: "not-connected", canManage });
          return;
        }
        if (!response.ok) {
          setState({ kind: "unavailable" });
          return;
        }
        const payload = (await response.json()) as {
          connected?: boolean;
          canManage?: boolean;
          status?: string;
          boardName?: string | null;
          lastSyncedAt?: string | null;
          lastErrorMessage?: string | null;
        };
        const manageable = payload.canManage ?? canManage;
        setState(payload.connected
          ? {
              kind: "connected",
              canManage: manageable,
              needsAttention: Boolean(payload.lastErrorMessage),
              detail: manageable
                ? payload.lastErrorMessage
                  ? payload.lastErrorMessage
                  : `${payload.boardName ?? "Accounts board"} · ${payload.lastSyncedAt ? `Last synced ${new Date(payload.lastSyncedAt).toLocaleString()}` : "Not synced yet"}`
                : payload.lastErrorMessage
                  ? "Sync needs administrator attention."
                  : payload.lastSyncedAt
                    ? `Accounts last synced ${new Date(payload.lastSyncedAt).toLocaleString()}.`
                    : "Accounts sync is connected.",
            }
          : { kind: "not-connected", canManage: manageable });
      })
      .catch(() => {
        if (active) setState({ kind: "unavailable" });
      });
    return () => {
      active = false;
    };
  }, [canManage]);

  const label = state.kind === "connected"
    ? state.needsAttention ? "Needs attention" : "Connected"
    : state.kind === "loading"
      ? "Checking…"
      : state.kind === "not-connected"
        ? "Not connected"
        : "Status unavailable";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <h2 className="font-semibold">Monday sync</h2>
        <Badge tone={state.kind === "connected" && !state.needsAttention ? "success" : "neutral"}>{label}</Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-valere-muted">
          {state.kind === "connected"
            ? state.detail
            : state.kind === "loading"
              ? "Checking integration status."
              : state.kind === "not-connected" && state.canManage
                ? "Connect Monday in Settings to sync Accounts."
                : "Accounts sync is not connected."}
        </p>
        {(state.kind === "connected" && state.canManage) || (state.kind === "not-connected" && state.canManage) ? (
          <Link href="/admin/integrations" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
            {state.kind === "connected" && !state.needsAttention ? "Manage integration" : "Open integration settings"}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { emitTimerChanged, subscribeToTimerChanges } from "@/components/time/timer-events";

type Timer = {
  startedAt: string;
  note: string;
  client: { name: string };
};

const CHIP_SOURCE = "timer-chip";

export function TimerChip() {
  const [timer, setTimer] = useState<Timer | null>(null);
  const [elapsed, setElapsed] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionPending, setActionPending] = useState<"stop" | "discard" | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/timer");
      if (!response.ok) throw new Error("Timer unavailable");
      const payload = (await response.json()) as { timer: Timer | null };
      setTimer(payload.timer);
      setLoadError("");
    } catch {
      setLoadError("Timer unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => subscribeToTimerChanges(CHIP_SOURCE, () => void refresh()), [refresh]);

  useEffect(() => {
    if (!timer) return;
    function tick() {
      if (!timer) return;
      const ms = Date.now() - new Date(timer.startedAt).getTime();
      const minutes = Math.floor(ms / 60000);
      const hours = Math.floor(minutes / 60);
      setElapsed(`${hours}h ${minutes % 60}m`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  async function act(action: "stop" | "discard") {
    if (actionPending) return;
    setActionPending(action);
    setActionError("");
    try {
      const response = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error("Timer action failed");
      setConfirmDiscard(false);
      emitTimerChanged(CHIP_SOURCE);
      await refresh();
    } catch {
      setActionError(action === "stop" ? "Unable to stop the timer." : "Unable to discard the timer.");
    } finally {
      setActionPending(null);
    }
  }

  if (loading) {
    return (
      <span role="status" className="flex items-center">
        <span className="h-8 w-32 animate-pulse rounded-md bg-valere-surface" aria-hidden />
        <span className="sr-only">Loading timer</span>
      </span>
    );
  }

  if (loadError && !timer) {
    return (
      <span role="status" className="text-xs font-medium text-valere-danger">
        {loadError}
      </span>
    );
  }

  if (!timer) {
    return (
      <span className="rounded-full border bg-valere-surface px-3 py-1.5 text-xs text-valere-muted">
        No timer running
      </span>
    );
  }

  // While the dialog is open its own alert carries the action error.
  const inlineError = (confirmDiscard ? "" : actionError) || loadError;

  return (
    <div className="flex max-w-full flex-col items-end gap-1">
      <div className="flex max-w-full items-center gap-2 rounded-lg border bg-white px-2 py-1.5 text-xs shadow-sm">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-valere-success" aria-hidden />
        <span className="max-w-40 truncate font-medium sm:max-w-64">
          {timer.client.name} · {elapsed}
        </span>
        <button
          type="button"
          className="rounded bg-valere-fg px-2 py-1 font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
          onClick={() => void act("stop")}
          disabled={actionPending !== null}
        >
          {actionPending === "stop" ? "Stopping…" : "Stop"}
        </button>
        <button
          type="button"
          className="rounded px-1.5 py-1 text-valere-muted transition hover:bg-valere-surface hover:text-valere-danger disabled:opacity-50"
          onClick={() => setConfirmDiscard(true)}
          disabled={actionPending !== null}
        >
          Discard
        </button>
      </div>
      {inlineError ? (
        <p role="status" className="max-w-xs text-right text-xs font-medium text-valere-danger">
          {inlineError}
        </p>
      ) : null}
      <ConfirmationDialog
        open={confirmDiscard}
        title="Discard running timer?"
        description={`The ${elapsed} session on ${timer.client.name} will be removed without creating a time entry. This cannot be undone.`}
        confirmLabel="Discard timer"
        destructive
        pending={actionPending === "discard"}
        error={actionError}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => void act("discard")}
      />
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Select, Textarea } from "@/components/ui/form-field";
import { emitTimerChanged, subscribeToTimerChanges } from "./timer-events";
import type { ActiveTimer, TimeAccount } from "./types";
import { sendTimeRequest } from "./use-time-data";

type Props = {
  accounts: TimeAccount[];
  timer: ActiveTimer | null;
  onChanged: () => Promise<void>;
};

const TIMER_SOURCE = "timer-panel";

function elapsedSince(startedAt: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function TimerPanel({ accounts, timer, onChanged }: Props) {
  const trackable = useMemo(() => accounts.filter((account) => account.trackable), [accounts]);
  const [clientId, setClientId] = useState("");
  const [note, setNote] = useState("");
  const [elapsed, setElapsed] = useState(timer ? elapsedSince(timer.startedAt) : "");
  const [pending, setPending] = useState<"start" | "stop" | "discard" | null>(null);
  const [error, setError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!clientId && trackable[0]) setClientId(trackable[0].id);
  }, [clientId, trackable]);

  useEffect(() => subscribeToTimerChanges(TIMER_SOURCE, () => void onChanged()), [onChanged]);

  useEffect(() => {
    if (!timer) {
      setElapsed("");
      return;
    }
    const update = () => setElapsed(elapsedSince(timer.startedAt));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [timer]);

  async function act(action: "start" | "stop" | "discard") {
    if (pending) return;
    setPending(action);
    setError("");
    try {
      await sendTimeRequest("/api/timer", "POST", {
        action,
        ...(action === "start" ? { clientId, note: note.trim() } : {}),
      });
      if (action === "start") setNote("");
      setConfirmDiscard(false);
      emitTimerChanged(TIMER_SOURCE);
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The timer could not be updated.");
    } finally {
      setPending(null);
    }
  }

  function start(event: FormEvent) {
    event.preventDefault();
    if (!clientId) {
      setError("Choose an account before starting the timer.");
      return;
    }
    void act("start");
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Live timer</h2>
              <p className="mt-1 text-sm text-valere-muted">Only one timer can run at a time.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${timer ? "bg-green-50 text-valere-success" : "bg-valere-surface text-valere-muted"}`}>
              {timer ? "Running" : "Not running"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {timer ? (
            <div className="space-y-5">
              <div>
                <p className="editorial-kicker">Current session</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{elapsed}</p>
                <p className="mt-1 text-sm">{timer.client.name}</p>
                <p className="mt-1 text-sm text-valere-muted">{timer.note || "No note added"}</p>
              </div>
              {error && !confirmDiscard ? <Alert tone="danger">{error}</Alert> : null}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void act("stop")} loading={pending === "stop"} disabled={pending !== null}>
                  {pending === "stop" ? "Stopping…" : "Stop and save"}
                </Button>
                <Button variant="danger" onClick={() => setConfirmDiscard(true)} disabled={pending !== null}>
                  Discard
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={start}>
              <Select
                id="timer-account"
                label="Account"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                disabled={pending !== null || trackable.length === 0}
                required
              >
                <option value="">Choose an account</option>
                {trackable.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </Select>
              <Textarea
                id="timer-note"
                label="What are you working on?"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={pending !== null}
              />
              {error ? <Alert tone="danger">{error}</Alert> : null}
              <Button type="submit" loading={pending === "start"} disabled={trackable.length === 0}>
                {pending === "start" ? "Starting…" : "Start timer"}
              </Button>
              {trackable.length === 0 ? (
                <p role="status" className="text-sm text-valere-muted">No trackable accounts are available.</p>
              ) : null}
            </form>
          )}
        </CardContent>
      </Card>
      <ConfirmationDialog
        open={confirmDiscard}
        title="Discard running timer?"
        description="This session will be removed without creating a time entry. This cannot be undone."
        confirmLabel="Discard timer"
        destructive
        pending={pending === "discard"}
        error={error}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => void act("discard")}
      />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";

type Timer = {
  startedAt: string;
  note: string;
  client: { name: string };
};

export function TimerChip() {
  const [timer, setTimer] = useState<Timer | null>(null);
  const [elapsed, setElapsed] = useState("");

  async function refresh() {
    const response = await fetch("/api/timer");
    if (!response.ok) return;
    const payload = (await response.json()) as { timer: Timer | null };
    setTimer(payload.timer);
  }

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 15000);
    return () => clearInterval(interval);
  }, []);

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
    await fetch("/api/timer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await refresh();
  }

  if (!timer) {
    return <span className="text-xs text-valere-muted">No timer running</span>;
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
      <span>
        {timer.client.name} · {elapsed}
      </span>
      <button className="rounded border border-valere-border px-2 py-1" onClick={() => void act("stop")}>
        Stop
      </button>
      <button className="text-valere-muted" onClick={() => void act("discard")}>
        Discard
      </button>
    </div>
  );
}

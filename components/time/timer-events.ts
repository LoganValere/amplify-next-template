"use client";

export const TIMER_CHANGED_EVENT = "valere:timer-changed";

type TimerChangedDetail = { source: string };

/** Emitted only after a successful timer mutation so other surfaces re-read server state. */
export function emitTimerChanged(source: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<TimerChangedDetail>(TIMER_CHANGED_EVENT, { detail: { source } }));
}

/** Listeners ignore their own emissions so a mutation triggers exactly one reload per surface. */
export function subscribeToTimerChanges(source: string, handler: () => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<TimerChangedDetail>).detail;
    if (detail?.source === source) return;
    handler();
  };
  window.addEventListener(TIMER_CHANGED_EVENT, listener);
  return () => window.removeEventListener(TIMER_CHANGED_EVENT, listener);
}

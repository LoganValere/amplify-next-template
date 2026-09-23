"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeToTimerChanges } from "./timer-events";
import type { ActiveTimer, SessionUser, TimeAccount, TimeCategory, TimeData, TimeEntry } from "./types";

export const ENTRY_LIMIT = 200;

export type TimeEntryQuery = { from?: string; to?: string; clientId?: string };

async function readJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Unable to load ${url}`);
  return payload;
}

/** The API only narrows by date when both bounds are present. */
function buildTimeUrl({ from = "", to = "", clientId = "" }: TimeEntryQuery) {
  const params = new URLSearchParams();
  if (from && to) {
    params.set("from", from);
    params.set("to", to);
  }
  if (clientId) params.set("clientId", clientId);
  const search = params.toString();
  return search ? `/api/time?${search}` : "/api/time";
}

export function useTimeData(
  options: { includeCategories?: boolean; query?: TimeEntryQuery; timerSource?: string } = {},
) {
  const { includeCategories = true, query, timerSource } = options;
  const from = query?.from ?? "";
  const to = query?.to ?? "";
  const clientId = query?.clientId ?? "";
  const activeQueryKey = buildTimeUrl({ from, to, clientId });
  const [data, setData] = useState<TimeData>({
    accounts: [],
    categories: [],
    entries: [],
    timer: null,
    user: null,
  });
  // Identifies the query the rows in `data` belong to, so a surface never shows
  // entries from a previous filter underneath the newly selected one.
  const [loadedQueryKey, setLoadedQueryKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const loadedQueryKeyRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    const queryKey = buildTimeUrl({ from, to, clientId });
    const requestId = ++requestIdRef.current;
    // Overlapping loads would otherwise resolve out of order and paint stale rows.
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;
    const { signal } = controller;
    const queryChanged = loadedQueryKeyRef.current !== queryKey;
    if (queryChanged) {
      setLoading(true);
      setError("");
    }
    try {
      const [accounts, entries, timer, user] = await Promise.all([
        readJson<{ accounts: TimeAccount[] }>("/api/accounts", signal),
        readJson<{ entries: TimeEntry[] }>(queryKey, signal),
        readJson<{ timer: ActiveTimer | null }>("/api/timer", signal),
        readJson<SessionUser>("/api/auth/me", signal),
      ]);
      const categories = includeCategories
        ? await readJson<{ categories: TimeCategory[] }>("/api/categories", signal)
        : { categories: [] };
      if (requestId !== requestIdRef.current) return;
      setData({
        accounts: accounts.accounts ?? [],
        entries: entries.entries ?? [],
        timer: timer.timer,
        user,
        categories: categories.categories ?? [],
      });
      loadedQueryKeyRef.current = queryKey;
      setLoadedQueryKey(queryKey);
      setError("");
      setRefreshError("");
    } catch (caught) {
      if (signal.aborted || requestId !== requestIdRef.current) return;
      const message = caught instanceof Error ? caught.message : "Unable to load time data";
      // A failed background refresh must not tear down surfaces that already have
      // data, but data loaded for a different query cannot stand in for this one.
      if (loadedQueryKeyRef.current === queryKey) setRefreshError(message);
      else setError(message);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [clientId, from, includeCategories, to]);

  useEffect(() => {
    void refresh();
    return () => inFlightRef.current?.abort();
  }, [refresh]);

  useEffect(() => {
    if (!timerSource) return;
    return subscribeToTimerChanges(timerSource, () => void refresh());
  }, [refresh, timerSource]);

  return {
    data,
    loading,
    // True until the rows in `data` match the query this surface is asking for.
    queryLoading: loadedQueryKey !== activeQueryKey,
    error,
    refreshError,
    refresh,
  };
}

export async function sendTimeRequest<T>(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "The request could not be completed");
  return payload;
}

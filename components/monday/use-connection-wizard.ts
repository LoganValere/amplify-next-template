"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stableMondayWizardMode, type MondayUiError } from "@/lib/monday/wizard";
import { mondayRequest, readBoards, readSettings } from "./api";
import type {
  MondayBoard,
  MondayIdentity,
  MondaySettings,
  WizardAction,
  WizardController,
  WizardMode,
} from "./types";

function normalizeError(error: unknown): MondayUiError {
  if (error && typeof error === "object" && "title" in error && "message" in error) {
    return error as MondayUiError;
  }
  return {
    title: "Network request failed",
    message: "Check your connection and try again. Your Monday settings were not changed.",
  };
}

export function useConnectionWizard(): WizardController {
  const [settings, setSettings] = useState<MondaySettings | null>(null);
  const [boards, setBoards] = useState<MondayBoard[]>([]);
  const [boardId, setBoardId] = useState("");
  const [identity, setIdentity] = useState<MondayIdentity | null>(null);
  const [notice, setNotice] = useState<MondayUiError | null>(null);
  const [success, setSuccess] = useState("");
  const [disconnectError, setDisconnectError] = useState("");
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "failed">("loading");
  const [mode, setMode] = useState<WizardMode>("token");
  const [action, setAction] = useState<WizardAction | null>("load");
  const actionRef = useRef<WizardAction | null>("load");
  const tokenRef = useRef("");
  const sequenceRef = useRef(0);
  const mountedRef = useRef(true);

  const run = useCallback(async (
    nextAction: WizardAction,
    operation: (isCurrent: () => boolean) => Promise<void>,
    options: { clearNotice?: boolean; disconnect?: boolean } = {},
  ) => {
    if (actionRef.current) return;
    actionRef.current = nextAction;
    setAction(nextAction);
    if (options.clearNotice !== false) setNotice(null);
    if (options.disconnect) setDisconnectError("");
    setSuccess("");
    const sequence = ++sequenceRef.current;
    const isCurrent = () => mountedRef.current && sequenceRef.current === sequence;
    try {
      await operation(isCurrent);
    } catch (error) {
      if (!isCurrent()) return;
      const normalized = normalizeError(error);
      if (options.disconnect) setDisconnectError(`${normalized.title}. ${normalized.message}`);
      else setNotice(normalized);
    } finally {
      if (isCurrent()) {
        actionRef.current = null;
        setAction(null);
      }
    }
  }, []);

  const loadSettings = useCallback((signal?: AbortSignal) => {
    actionRef.current = null;
    void run("load", async (isCurrent) => {
      setLoadState("loading");
      const payload = await mondayRequest("/api/monday/settings", { signal });
      if (!isCurrent()) return;
      const next = readSettings(payload);
      setSettings(next);
      setMode(stableMondayWizardMode(next.connected));
      setNotice(null);
      setLoadState("ready");
    }, { clearNotice: false }).catch(() => undefined);
  }, [run]);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    loadSettings(controller.signal);
    return () => {
      mountedRef.current = false;
      sequenceRef.current += 1;
      controller.abort();
    };
  }, [loadSettings]);

  useEffect(() => {
    if (action !== null || loadState !== "loading") return;
    setLoadState("failed");
  }, [action, loadState]);

  function retryLoad() {
    if (actionRef.current) return;
    loadSettings();
  }

  function validateToken(token: string) {
    if (!token || actionRef.current) return;
    void run("boards", async (isCurrent) => {
      const payload = await mondayRequest("/api/monday/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!isCurrent()) return;
      const nextBoards = readBoards(payload);
      if (!nextBoards.length) {
        setNotice({ title: "No accessible boards", message: "This token cannot access any Monday boards." });
        return;
      }
      tokenRef.current = token;
      setBoards(nextBoards);
      setBoardId(nextBoards[0]?.id ?? "");
      setMode("token-board");
    });
  }

  function connectToken() {
    if (!tokenRef.current || !boardId || actionRef.current) return;
    const token = tokenRef.current;
    void run("connect", async (isCurrent) => {
      const payload = await mondayRequest("/api/monday/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, boardId }),
      });
      tokenRef.current = "";
      if (!isCurrent()) return;
      setSettings(readSettings(payload));
      setBoards([]);
      setBoardId("");
      setIdentity(null);
      setMode("view");
      setSuccess("Monday is connected. You can now sync Accounts.");
    });
  }

  function startBoardChange() {
    if (actionRef.current) return;
    void run("boards", async (isCurrent) => {
      const payload = await mondayRequest("/api/monday/boards");
      if (!isCurrent()) return;
      const nextBoards = readBoards(payload);
      if (!nextBoards.length) {
        setNotice({ title: "No accessible boards", message: "The saved token cannot access any Monday boards." });
        return;
      }
      setBoards(nextBoards);
      setBoardId(settings?.boardId ?? nextBoards[0]?.id ?? "");
      setMode("board");
    });
  }

  function saveBoardChange() {
    if (!boardId || actionRef.current) return;
    void run("connect", async (isCurrent) => {
      const payload = await mondayRequest("/api/monday/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId }),
      });
      if (!isCurrent()) return;
      setSettings(readSettings(payload));
      setIdentity(null);
      setBoards([]);
      setBoardId("");
      setMode("view");
      setSuccess("Accounts board changed.");
    });
  }

  function startReconnect() {
    if (actionRef.current) return;
    tokenRef.current = "";
    setBoards([]);
    setBoardId("");
    setMode("token");
    setNotice(null);
    setSuccess("");
  }

  function cancelEdit() {
    if (actionRef.current) return;
    sequenceRef.current += 1;
    tokenRef.current = "";
    setBoards([]);
    setBoardId("");
    setNotice(null);
    setMode(stableMondayWizardMode(Boolean(settings?.connected)));
  }

  function testConnection() {
    void run("test", async (isCurrent) => {
      const payload = await mondayRequest("/api/monday/test", { method: "POST" });
      if (!isCurrent()) return;
      setIdentity(payload.identity as MondayIdentity);
      setSettings(payload.settings as MondaySettings);
      setSuccess("Connection test passed.");
    });
  }

  function sync() {
    void run("sync", async (isCurrent) => {
      const payload = await mondayRequest("/api/monday/sync", { method: "POST" });
      if (!isCurrent()) return;
      setSuccess(`Synced ${payload.created ?? 0} created, ${payload.updated ?? 0} updated, and ${payload.archived ?? 0} archived.`);
      const refreshed = await mondayRequest("/api/monday/settings");
      if (isCurrent()) setSettings(readSettings(refreshed));
    });
  }

  function disconnect() {
    void run("disconnect", async (isCurrent) => {
      const payload = await mondayRequest("/api/monday/settings", { method: "DELETE" });
      if (!isCurrent()) return;
      setSettings(readSettings(payload));
      setIdentity(null);
      setDisconnectOpen(false);
      setMode("token");
      setSuccess("Monday was disconnected.");
    }, { disconnect: true });
  }

  return {
    settings, boards, boardId, identity, notice, success, disconnectError, disconnectOpen,
    loadState, mode, action, disabled: action !== null, setBoardId, retryLoad, validateToken,
    connectToken, startBoardChange, saveBoardChange, startReconnect, cancelEdit, testConnection,
    sync, openDisconnect: () => setDisconnectOpen(true),
    closeDisconnect: () => { if (!actionRef.current) { setDisconnectOpen(false); setDisconnectError(""); } },
    disconnect,
  };
}

import type { MondayUiError } from "@/lib/monday/wizard";

export type MondaySettings = {
  connected: boolean;
  boardId: string | null;
  boardName: string | null;
  status: string;
  lastTestedAt: string | null;
  lastSyncedAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
};

export type MondayBoard = { id: string; name: string; state: string };
export type MondayIdentity = { name: string; email: string; account: { name: string } };
export type WizardMode = "view" | "token" | "token-board" | "board";
export type WizardAction = "load" | "boards" | "connect" | "test" | "sync" | "disconnect";
export type LoadState = "loading" | "ready" | "failed";

export type WizardController = {
  settings: MondaySettings | null;
  boards: MondayBoard[];
  boardId: string;
  identity: MondayIdentity | null;
  notice: MondayUiError | null;
  success: string;
  disconnectError: string;
  disconnectOpen: boolean;
  loadState: LoadState;
  mode: WizardMode;
  action: WizardAction | null;
  disabled: boolean;
  setBoardId: (boardId: string) => void;
  retryLoad: () => void;
  validateToken: (token: string) => void;
  connectToken: () => void;
  startBoardChange: () => void;
  saveBoardChange: () => void;
  startReconnect: () => void;
  cancelEdit: () => void;
  testConnection: () => void;
  sync: () => void;
  openDisconnect: () => void;
  closeDisconnect: () => void;
  disconnect: () => void;
};

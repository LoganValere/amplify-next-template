"use client";

import { FormEvent, useEffect, useRef } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-field";
import type { WizardController } from "./types";

export function WizardAnnouncement({ wizard }: { wizard: WizardController }) {
  if (wizard.loadState !== "ready") return null;
  return (
    <div className="space-y-3">
      {wizard.notice ? (
        <Alert tone="danger">
          <strong>{wizard.notice.title}</strong>
          <p className="mt-1">{wizard.notice.message}</p>
          {wizard.notice.missingColumnIds?.length ? (
            <ul className="mt-2 list-disc pl-5">
              {wizard.notice.missingColumnIds.map((id) => <li key={id}><code>{id}</code></li>)}
            </ul>
          ) : null}
        </Alert>
      ) : null}
      {wizard.success ? <Alert tone="success">{wizard.success}</Alert> : null}
    </div>
  );
}

export function LoadFailure({ wizard }: { wizard: WizardController }) {
  return (
    <Alert tone="danger">
      <strong>{wizard.notice?.title ?? "Settings unavailable"}</strong>
      <p className="mt-1">{wizard.notice?.message ?? "Monday settings could not be loaded."}</p>
      <Button className="mt-3" variant="secondary" onClick={wizard.retryLoad} loading={wizard.action === "load"}>
        Retry
      </Button>
    </Alert>
  );
}

export function TokenForm({ wizard }: { wizard: WizardController }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = inputRef.current?.value.trim() ?? "";
    wizard.validateToken(token);
  }

  function cancel() {
    if (inputRef.current) inputRef.current.value = "";
    wizard.cancelEdit();
  }

  return (
    <form className="max-w-xl space-y-4" onSubmit={submit}>
      <Input
        ref={inputRef}
        id="monday-token"
        label="Monday API token"
        type="password"
        autoComplete="off"
        hint="Used only to validate access. It is stored only after you connect."
        required
        disabled={wizard.disabled}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={wizard.action === "boards"} disabled={wizard.disabled}>Validate and list boards</Button>
        {wizard.settings?.connected ? <Button variant="secondary" onClick={cancel} disabled={wizard.disabled}>Cancel</Button> : null}
      </div>
    </form>
  );
}

export function BoardForm({ wizard }: { wizard: WizardController }) {
  const selectRef = useRef<HTMLSelectElement>(null);
  useEffect(() => { selectRef.current?.focus(); }, []);
  const changingBoard = wizard.mode === "board";
  return (
    <div className="max-w-xl space-y-4">
      <Select
        ref={selectRef}
        id="monday-board"
        label="Accounts board"
        value={wizard.boardId}
        onChange={(event) => wizard.setBoardId(event.target.value)}
        disabled={wizard.disabled}
      >
        {wizard.boards.map((board) => (
          <option key={board.id} value={board.id}>
            {board.name}{board.state !== "active" ? ` (${board.state})` : ""}
          </option>
        ))}
      </Select>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={changingBoard ? wizard.saveBoardChange : wizard.connectToken}
          loading={wizard.action === "connect"}
          disabled={wizard.disabled || !wizard.boardId}
        >
          {changingBoard ? "Save board" : "Connect"}
        </Button>
        <Button variant="secondary" onClick={wizard.cancelEdit} disabled={wizard.disabled}>Cancel</Button>
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export function ConnectedView({ wizard }: { wizard: WizardController }) {
  const settings = wizard.settings!;
  return (
    <div className="space-y-5">
      <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="text-valere-muted">Board</dt><dd className="mt-1 font-medium">{settings.boardName ?? settings.boardId}</dd></div>
        <div><dt className="text-valere-muted">Last sync</dt><dd className="mt-1">{formatDate(settings.lastSyncedAt)}</dd></div>
        <div><dt className="text-valere-muted">Last tested</dt><dd className="mt-1">{formatDate(settings.lastTestedAt)}</dd></div>
      </dl>
      {wizard.identity ? <p className="text-sm text-valere-muted">Authenticated as <strong className="text-valere-fg">{wizard.identity.name}</strong> ({wizard.identity.email}) in {wizard.identity.account.name}.</p> : null}
      {settings.lastErrorMessage ? <Alert tone="warning"><strong>Last Monday error</strong><p className="mt-1">{settings.lastErrorMessage}</p></Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={wizard.sync} loading={wizard.action === "sync"} disabled={wizard.disabled}>Sync now</Button>
        <Button variant="secondary" onClick={wizard.testConnection} loading={wizard.action === "test"} disabled={wizard.disabled}>Test connection</Button>
        <Button variant="secondary" onClick={wizard.startBoardChange} loading={wizard.action === "boards"} disabled={wizard.disabled}>Change board</Button>
        <Button variant="secondary" onClick={wizard.startReconnect} disabled={wizard.disabled}>Reconnect with new token</Button>
        <Button variant="danger" onClick={wizard.openDisconnect} disabled={wizard.disabled}>Disconnect</Button>
      </div>
    </div>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/dialog";
import {
  BoardForm,
  ConnectedView,
  LoadFailure,
  TokenForm,
  WizardAnnouncement,
} from "./connection-wizard-views";
import { useConnectionWizard } from "./use-connection-wizard";

export function MondayConnectionWizard() {
  const wizard = useConnectionWizard();
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div><h2 className="font-semibold">Monday Accounts sync</h2><p className="mt-1 text-sm text-valere-muted">Connect one fixed-schema Accounts board.</p></div>
          <Badge tone={wizard.settings?.connected ? "success" : "neutral"}>
            {wizard.settings?.connected ? wizard.settings.status : "Disconnected"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          {wizard.loadState === "loading" ? <p role="status" className="text-sm text-valere-muted">Loading Monday settings…</p> : null}
          {wizard.loadState === "failed" ? <LoadFailure wizard={wizard} /> : null}
          <WizardAnnouncement wizard={wizard} />
          {wizard.loadState === "ready" && wizard.mode === "token" ? <TokenForm wizard={wizard} /> : null}
          {wizard.loadState === "ready" && (wizard.mode === "token-board" || wizard.mode === "board") ? <BoardForm wizard={wizard} /> : null}
          {wizard.loadState === "ready" && wizard.mode === "view" ? <ConnectedView wizard={wizard} /> : null}
        </CardContent>
      </Card>
      <ConfirmationDialog
        open={wizard.disconnectOpen}
        title="Disconnect Monday?"
        description="Account sync will stop. Existing account data will remain, and the stored token will be removed."
        confirmLabel="Disconnect"
        destructive
        pending={wizard.action === "disconnect"}
        error={wizard.disconnectError}
        onConfirm={wizard.disconnect}
        onClose={wizard.closeDisconnect}
      />
    </>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { MondayConnectionWizard } from "@/components/monday/connection-wizard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form-field";
import { AccountSelect, readPayload } from "./fields";
import type { Account } from "./types";

export function IntegrationsSettings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/accounts")
      .then(readPayload)
      .then((payload) => {
        setAccounts((payload.accounts ?? []) as Account[]);
        setError("");
      })
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  async function connectLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const kind = String(form.get("kind"));
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.get("clientId"),
          kind,
          externalId: form.get("externalId"),
          ingest: kind === "drive_folder",
        }),
      });
      const payload = await readPayload(response);
      setMessage(kind === "drive_folder" ? `Drive folder connected. ${payload.ingested ?? 0} files ingested.` : "Monday workspace linked.");
      event.currentTarget.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to connect integration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="integrations-title" className="space-y-6">
      <div><h2 id="integrations-title" className="text-xl font-semibold">Integrations</h2><p className="mt-1 text-sm text-valere-muted">Connect the central Accounts board and account-specific workspaces.</p></div>
      <MondayConnectionWizard />
      <Card>
        <CardHeader><h3 className="font-semibold">Account workspace links</h3><p className="mt-1 text-sm text-valere-muted">Attach a Drive SOW folder or Monday workspace to an account.</p></CardHeader>
        <CardContent>
          <div aria-live="polite" className="mb-4 space-y-2">{error ? <Alert tone="danger">{error}</Alert> : null}{message ? <Alert tone="success">{message}</Alert> : null}</div>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={connectLink}>
            <AccountSelect accounts={accounts} id="integration-account" />
            <Select id="integration-kind" name="kind" label="Integration type">
              <option value="drive_folder">Google Drive folder</option>
              <option value="monday_workspace">Monday workspace</option>
            </Select>
            <Input id="integration-external-id" className="md:col-span-2" name="externalId" label="Folder URL or workspace ID" required />
            <Button className="w-fit" type="submit" variant="secondary" loading={loading}>Connect workspace</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

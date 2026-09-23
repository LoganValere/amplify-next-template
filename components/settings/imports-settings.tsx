"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { readPayload } from "./fields";
import type { KimaiRow } from "./types";

export function ImportsSettings() {
  const [rows, setRows] = useState<KimaiRow[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    try {
      const payload = await fetch("/api/kimai").then(readPayload);
      setRows((payload.rows ?? []) as KimaiRow[]);
      setError("");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load import queue."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/kimai", { method: "POST", body: new FormData(event.currentTarget) });
      const payload = await readPayload(response);
      setNotice(`Imported ${payload.imported ?? 0} entries; ${payload.pending ?? 0} need review.`);
      event.currentTarget.reset(); await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to import CSV."); }
    finally { setLoading(false); }
  }

  return (
    <section aria-labelledby="imports-title" className="space-y-6">
      <div><h2 id="imports-title" className="text-xl font-semibold">Imports</h2><p className="mt-1 text-sm text-valere-muted">Import historical time entries exported from Kimai.</p></div>
      <div aria-live="polite" className="space-y-2">{error ? <Alert tone="danger">{error}</Alert> : null}{notice ? <Alert tone="success">{notice}</Alert> : null}</div>
      <Card><CardHeader><h3 className="font-semibold">Kimai CSV</h3><p className="mt-1 text-sm text-valere-muted">Unmatched rows remain in the review queue for later reconciliation.</p></CardHeader><CardContent>
        <form className="flex flex-col items-start gap-4 sm:flex-row sm:items-end" onSubmit={upload}>
          <div className="space-y-1.5"><label htmlFor="kimai-file">CSV file</label><input id="kimai-file" name="file" type="file" accept=".csv,text/csv" required /></div>
          <Button type="submit" variant="secondary" loading={loading}>Import CSV</Button>
        </form>
        <p className="mt-5 text-sm text-valere-muted">
          {rows.length === 0 ? "No unmatched rows in the review queue." : `${rows.length} unmatched ${rows.length === 1 ? "row" : "rows"} in the review queue.`}
        </p>
      </CardContent></Card>
    </section>
  );
}

"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form-field";
import { AccountSelect, CategorySelect, readPayload } from "./fields";
import type { Account, Category, Retainer } from "./types";

export function BudgetsSettings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [retainers, setRetainers] = useState<Retainer[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    try {
      const [a, c, r] = await Promise.all(["/api/accounts", "/api/categories", "/api/retainers"].map((url) => fetch(url).then(readPayload)));
      setAccounts((a.accounts ?? []) as Account[]); setCategories((c.categories ?? []) as Category[]); setRetainers((r.retainers ?? []) as Retainer[]);
      setError("");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load budgets."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>, kind: "grant" | "retainer") {
    event.preventDefault(); setBusy(kind); setError(""); setNotice("");
    const data = new FormData(event.currentTarget);
    const body = kind === "grant"
      ? { clientId: data.get("clientId"), hourCategoryId: data.get("hourCategoryId"), hours: Number(data.get("hours")), type: data.get("type"), note: data.get("note") }
      : { clientId: data.get("clientId"), hourCategoryId: data.get("hourCategoryId"), hoursPerPeriod: Number(data.get("hoursPerPeriod")), replenishDayOfMonth: Number(data.get("day")), startDate: data.get("startDate"), rolloverPolicy: data.get("rolloverPolicy") };
    try {
      await readPayload(await fetch(kind === "grant" ? "/api/budgets" : "/api/retainers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
      event.currentTarget.reset(); setNotice(kind === "grant" ? "Prepaid hours added." : "Retainer created."); await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to save budget."); }
    finally { setBusy(""); }
  }

  return (
    <section aria-labelledby="budgets-title" className="space-y-6">
      <div><h2 id="budgets-title" className="text-xl font-semibold">Budgets</h2><p className="mt-1 text-sm text-valere-muted">Add prepaid hour grants and recurring retainers.</p></div>
      <div aria-live="polite" className="space-y-2">{error ? <Alert tone="danger">{error}</Alert> : null}{notice ? <Alert tone="success">{notice}</Alert> : null}</div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><h3 className="font-semibold">Prepaid hours</h3></CardHeader><CardContent>
          <form className="space-y-4" onSubmit={(event) => void submit(event, "grant")}>
            <AccountSelect accounts={accounts} id="grant-account" /><CategorySelect categories={categories} id="grant-category" />
            <Input id="grant-hours" name="hours" label="Hours" type="number" step="0.5" required />
            <Select id="grant-type" name="type" label="Grant type"><option value="initial">Initial</option><option value="replenish">Replenish</option></Select>
            <Input id="grant-note" name="note" label="Note" />
            <Button type="submit" loading={busy === "grant"}>Add grant</Button>
          </form>
        </CardContent></Card>
        <Card><CardHeader><h3 className="font-semibold">Create retainer</h3></CardHeader><CardContent>
          <form className="space-y-4" onSubmit={(event) => void submit(event, "retainer")}>
            <AccountSelect accounts={accounts} id="retainer-account" /><CategorySelect categories={categories} id="retainer-category" />
            <Input id="retainer-hours" name="hoursPerPeriod" label="Hours per month" type="number" min="0.5" step="0.5" required />
            <Input id="retainer-day" name="day" label="Replenishment day" type="number" min="1" max="31" required />
            <Input id="retainer-start" name="startDate" label="Start date" type="date" required />
            <Select id="retainer-rollover" name="rolloverPolicy" label="Rollover policy"><option value="expire">Expire unused</option><option value="accumulate">Accumulate</option></Select>
            <Button type="submit" loading={busy === "retainer"}>Create retainer</Button>
          </form>
        </CardContent></Card>
      </div>
      <Card><CardHeader><h3 className="font-semibold">Retainers</h3></CardHeader><CardContent><ul className="divide-y text-sm">{retainers.map((item) => <li key={item.id} className="py-3 first:pt-0 last:pb-0">{item.client.name} · {item.hourCategory.name} · {item.hoursPerPeriod}h on day {item.replenishDayOfMonth}{item.active ? "" : " · Paused"}</li>)}</ul></CardContent></Card>
    </section>
  );
}

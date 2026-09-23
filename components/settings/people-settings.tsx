"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form-field";
import { AccountSelect, readPayload } from "./fields";
import type { Account, Category, User } from "./types";

export function PeopleSettings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const [a, c, u] = await Promise.all(["/api/accounts", "/api/categories", "/api/users"].map((url) => fetch(url).then(readPayload)));
      setAccounts((a.accounts ?? []) as Account[]);
      setCategories((c.categories ?? []) as Category[]);
      setUsers((u.users ?? []) as User[]);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load people settings.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>, kind: "mapping" | "invite") {
    event.preventDefault(); setBusy(kind); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      const response = kind === "mapping"
        ? await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: form.get("id"), hourCategoryId: form.get("hourCategoryId") }) })
        : await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: form.get("clientId"), name: form.get("name"), email: form.get("email") }) });
      await readPayload(response);
      setNotice(kind === "mapping" ? "Staff category assignment saved." : "Client invitation sent.");
      if (kind === "invite") event.currentTarget.reset();
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save.");
    } finally { setBusy(""); }
  }

  return (
    <section aria-labelledby="people-title" className="space-y-6">
      <div><h2 id="people-title" className="text-xl font-semibold">People</h2><p className="mt-1 text-sm text-valere-muted">Assign staff time categories and invite client contacts.</p></div>
      <div aria-live="polite" className="space-y-2">{error ? <Alert tone="danger">{error}</Alert> : null}{notice ? <Alert tone="success">{notice}</Alert> : null}</div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><h3 className="font-semibold">Staff category assignment</h3></CardHeader><CardContent>
          <form className="space-y-4" onSubmit={(event) => void submit(event, "mapping")}>
            <Select id="mapping-user" name="id" label="Staff member" required><option value="">Select staff</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.hourCategory?.name ?? "unassigned"})</option>)}</Select>
            <Select id="mapping-category" name="hourCategoryId" label="Hour category" required><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select>
            <Button type="submit" loading={busy === "mapping"}>Save assignment</Button>
          </form>
        </CardContent></Card>
        <Card><CardHeader><h3 className="font-semibold">Invite client contact</h3></CardHeader><CardContent>
          <form className="space-y-4" onSubmit={(event) => void submit(event, "invite")}>
            <AccountSelect accounts={accounts} id="invite-account" />
            <Input id="invite-name" name="name" label="Name" required />
            <Input id="invite-email" name="email" label="Email" type="email" required />
            <Button type="submit" loading={busy === "invite"}>Send invitation</Button>
          </form>
        </CardContent></Card>
      </div>
    </section>
  );
}

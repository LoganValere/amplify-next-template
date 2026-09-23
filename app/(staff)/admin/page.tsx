"use client";

import { FormEvent, useEffect, useState } from "react";

type Account = { id: string; name: string };
type Category = { id: string; name: string; active: boolean };
type User = { id: string; name: string; email: string; hourCategory: { name: string } | null };
type Retainer = {
  id: string;
  hoursPerPeriod: number;
  replenishDayOfMonth: number;
  active: boolean;
  client: { name: string };
  hourCategory: { name: string };
};
type KimaiRow = { id: string; customer: string; project: string; email: string; activity: string };

export default function AdminPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [retainers, setRetainers] = useState<Retainer[]>([]);
  const [kimai, setKimai] = useState<KimaiRow[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [a, c, u, r, k] = await Promise.all([
      fetch("/api/accounts").then((res) => res.json()),
      fetch("/api/categories").then((res) => res.json()),
      fetch("/api/users").then((res) => res.json()),
      fetch("/api/retainers").then((res) => res.json()),
      fetch("/api/kimai").then((res) => res.json()),
    ]);
    setAccounts(a.accounts ?? []);
    setCategories(c.categories ?? []);
    setUsers(u.users ?? []);
    setRetainers(r.retainers ?? []);
    setKimai(k.rows ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function post(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    setMessage(payload.error ?? JSON.stringify(payload));
    await load();
  }

  async function syncMonday() {
    const response = await fetch("/api/monday/sync", { method: "POST" });
    const payload = await response.json();
    setMessage(payload.error ?? `Synced ${payload.upserted ?? 0} accounts`);
    await load();
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post("/api/invite", {
      email: form.get("email"),
      name: form.get("name"),
      clientId: form.get("clientId"),
    });
  }

  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post("/api/budgets", {
      clientId: form.get("clientId"),
      hourCategoryId: form.get("hourCategoryId"),
      hours: Number(form.get("hours")),
      type: form.get("type"),
      note: form.get("note"),
    });
  }

  async function retainer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post("/api/retainers", {
      clientId: form.get("clientId"),
      hourCategoryId: form.get("hourCategoryId"),
      hoursPerPeriod: Number(form.get("hoursPerPeriod")),
      replenishDayOfMonth: Number(form.get("day")),
      startDate: form.get("startDate"),
      rolloverPolicy: form.get("rolloverPolicy"),
    });
  }

  async function category(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post("/api/categories", { name: form.get("name") });
  }

  async function integration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post("/api/integrations", {
      clientId: form.get("clientId"),
      kind: form.get("kind"),
      externalId: form.get("externalId"),
      ingest: form.get("kind") === "drive_folder",
    });
  }

  async function mapUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: form.get("id"),
        hourCategoryId: form.get("hourCategoryId"),
      }),
    });
    await load();
  }

  async function uploadKimai(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/kimai", { method: "POST", body: data });
    const payload = await response.json();
    setMessage(payload.error ?? `Imported ${payload.imported}, unmatched ${payload.pending}`);
    await load();
  }

  return (
    <div className="space-y-10 max-w-4xl">
      <h1 className="text-2xl font-semibold">Admin</h1>
      {message ? <pre className="text-xs whitespace-pre-wrap text-valere-muted">{message}</pre> : null}

      <section className="space-y-3">
        <h2 className="font-medium">Monday sync</h2>
        <button className="rounded-md bg-white text-black px-4 py-2 text-sm" type="button" onClick={() => void syncMonday()}>
          Sync Accounts board
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Hour categories</h2>
        <form className="flex gap-2" onSubmit={category}>
          <input name="name" placeholder="Engineering" required />
          <button className="rounded-md border border-valere-border px-3">Add</button>
        </form>
        <ul className="text-sm text-valere-muted">
          {categories.map((item) => (
            <li key={item.id}>
              {item.name} {item.active ? "" : "(archived)"}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Resource category mapping</h2>
        <form className="grid md:grid-cols-3 gap-2" onSubmit={mapUser}>
          <select name="id">
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.hourCategory?.name ?? "none"})
              </option>
            ))}
          </select>
          <select name="hourCategoryId">
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button className="rounded-md border border-valere-border px-3">Save</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Prepaid hours</h2>
        <form className="grid md:grid-cols-2 gap-2" onSubmit={grant}>
          <AccountSelect accounts={accounts} />
          <CategorySelect categories={categories} />
          <input name="hours" type="number" step="0.5" placeholder="Hours" required />
          <select name="type">
            <option value="initial">Initial</option>
            <option value="replenish">Replenish</option>
          </select>
          <input className="md:col-span-2" name="note" placeholder="Note" />
          <button className="rounded-md bg-white text-black px-4 py-2 text-sm w-fit">Add grant</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Retainers</h2>
        <form className="grid md:grid-cols-2 gap-2" onSubmit={retainer}>
          <AccountSelect accounts={accounts} />
          <CategorySelect categories={categories} />
          <input name="hoursPerPeriod" type="number" placeholder="Hours / month" required />
          <input name="day" type="number" min={1} max={31} placeholder="Day of month" required />
          <input name="startDate" type="date" required />
          <select name="rolloverPolicy">
            <option value="expire">Expire unused</option>
            <option value="accumulate">Accumulate</option>
          </select>
          <button className="rounded-md bg-white text-black px-4 py-2 text-sm w-fit">Create retainer</button>
        </form>
        <ul className="text-sm">
          {retainers.map((item) => (
            <li key={item.id}>
              {item.client.name} · {item.hourCategory.name} · {item.hoursPerPeriod}h on day {item.replenishDayOfMonth}{" "}
              {item.active ? "" : "(paused)"}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Invite client contact</h2>
        <form className="grid md:grid-cols-2 gap-2" onSubmit={invite}>
          <AccountSelect accounts={accounts} />
          <input name="name" placeholder="Name" required />
          <input name="email" type="email" placeholder="client@company.com" required />
          <button className="rounded-md bg-white text-black px-4 py-2 text-sm w-fit">Invite</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Drive SOW / Monday workspace</h2>
        <form className="grid md:grid-cols-2 gap-2" onSubmit={integration}>
          <AccountSelect accounts={accounts} />
          <select name="kind">
            <option value="drive_folder">Google Drive folder</option>
            <option value="monday_workspace">Monday workspace ID</option>
          </select>
          <input className="md:col-span-2" name="externalId" placeholder="Folder URL or workspace id" required />
          <button className="rounded-md border border-valere-border px-3 w-fit">Connect</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Kimai CSV import</h2>
        <form className="flex gap-2 items-center" onSubmit={uploadKimai}>
          <input name="file" type="file" accept=".csv,text/csv" required />
          <button className="rounded-md border border-valere-border px-3">Import</button>
        </form>
        {kimai.length > 0 ? (
          <p className="text-sm text-valere-muted">{kimai.length} unmatched rows in the review queue.</p>
        ) : null}
      </section>
    </div>
  );
}

function AccountSelect({ accounts }: { accounts: Account[] }) {
  return (
    <select name="clientId" required>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}
        </option>
      ))}
    </select>
  );
}

function CategorySelect({ categories }: { categories: Category[] }) {
  return (
    <select name="hourCategoryId" required>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}

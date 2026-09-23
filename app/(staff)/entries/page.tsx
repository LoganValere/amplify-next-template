"use client";

import { FormEvent, useEffect, useState } from "react";

type Account = { id: string; name: string; trackable: boolean };
type Entry = {
  id: string;
  date: string;
  durationMinutes: number;
  description: string;
  client: { name: string };
  hourCategory: { name: string };
};

export default function EntriesPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("1");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [accountsRes, entriesRes] = await Promise.all([fetch("/api/accounts"), fetch("/api/time")]);
    const accountsJson = (await accountsRes.json()) as { accounts: Account[] };
    const entriesJson = (await entriesRes.json()) as { entries: Entry[] };
    setAccounts(accountsJson.accounts.filter((account) => account.trackable));
    setEntries(entriesJson.entries ?? []);
    if (!clientId && accountsJson.accounts[0]) setClientId(accountsJson.accounts[0].id);
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        date,
        durationHours: Number(hours),
        description,
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Could not save entry");
      return;
    }
    setDescription("");
    await load();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Manual entries</h1>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 max-w-3xl rounded-lg border border-valere-border p-4">
        <div className="flex flex-col gap-1">
          <label>Account</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label>Hours</label>
          <input type="number" min="0.25" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label>Notes</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {error ? <p className="text-sm text-red-400 md:col-span-2">{error}</p> : null}
        <button className="rounded-md bg-white text-black px-4 py-2 text-sm font-medium w-fit" type="submit">
          Add entry
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-valere-muted">
            <tr>
              <th className="py-2">Date</th>
              <th>Account</th>
              <th>Category</th>
              <th>Hours</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td className="py-6 text-valere-muted" colSpan={5}>
                  No entries yet.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-t border-valere-border">
                  <td className="py-2">{entry.date}</td>
                  <td>{entry.client.name}</td>
                  <td>{entry.hourCategory.name}</td>
                  <td>{(entry.durationMinutes / 60).toFixed(2)}</td>
                  <td>{entry.description}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

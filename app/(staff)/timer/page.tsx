"use client";

import { FormEvent, useEffect, useState } from "react";

type Account = { id: string; name: string; trackable: boolean };

export default function TimerPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clientId, setClientId] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/accounts")
      .then((res) => res.json())
      .then((payload: { accounts: Account[] }) => {
        const trackable = payload.accounts.filter((account) => account.trackable);
        setAccounts(trackable);
        if (trackable[0]) setClientId(trackable[0].id);
      });
  }, []);

  async function start(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/timer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", clientId, note }),
    });
    const payload = (await response.json()) as { error?: string };
    setMessage(payload.error ?? "Timer started");
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Live timer</h1>
      <p className="text-sm text-valere-muted">
        One timer per person. Hours draw down when you stop. Overnight runs split at midnight.
      </p>
      <form onSubmit={start} className="space-y-4 rounded-lg border border-valere-border p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="account">Account</label>
          <select id="account" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="note">Note</label>
          <input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="rounded-md bg-white text-black px-4 py-2 text-sm font-medium" type="submit">
          Start timer
        </button>
      </form>
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}

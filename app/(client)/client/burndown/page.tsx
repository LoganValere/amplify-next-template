"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Account = {
  id: string;
  balances: Array<{
    category: { id: string; name: string };
    balance: { remainingHours: number; nextRefillDate: string | null; mode: string };
  }>;
};

export default function ClientBurndownPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [series, setSeries] = useState<Array<{ date: string; remaining: number }>>([]);
  const from = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    void fetch("/api/accounts")
      .then((res) => res.json())
      .then((payload: { accounts: Account[] }) => {
        const first = payload.accounts?.[0];
        setAccount(first ?? null);
        setCategoryId(first?.balances[0]?.category.id ?? "");
      });
  }, []);

  useEffect(() => {
    if (!account || !categoryId) return;
    void fetch(
      `/api/reports?kind=burndown&from=${from}&to=${to}&clientId=${account.id}&hourCategoryId=${categoryId}`,
    )
      .then((res) => res.json())
      .then((payload) => setSeries(payload.series?.points ?? []));
  }, [account, categoryId, from, to]);

  const selected = account?.balances.find((row) => row.category.id === categoryId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Burndown</h1>
      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        {account?.balances.map((row) => (
          <option key={row.category.id} value={row.category.id}>
            {row.category.name}
          </option>
        ))}
      </select>
      <p className="text-sm text-valere-muted">
        {selected
          ? `${selected.balance.remainingHours.toFixed(2)}h remaining · ${selected.balance.mode}${
              selected.balance.nextRefillDate ? ` · next refill ${selected.balance.nextRefillDate}` : ""
            }`
          : ""}
      </p>
      <div className="h-72 border border-valere-border rounded-lg p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <XAxis dataKey="date" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="remaining" stroke="#5b8def" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Account = { id: string; name: string; balances: Array<{ category: { id: string; name: string } }> };
type HoursRow = { person: string; account: string; category: string; week: string; hours: number };

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const fromDefault = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(fromDefault);
  const [to, setTo] = useState(today);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clientId, setClientId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [rows, setRows] = useState<HoursRow[]>([]);
  const [series, setSeries] = useState<Array<{ date: string; remaining: number }>>([]);
  const [projection, setProjection] = useState("");

  useEffect(() => {
    void fetch("/api/accounts")
      .then((res) => res.json())
      .then((payload: { accounts: Account[] }) => {
        setAccounts(payload.accounts ?? []);
        if (payload.accounts?.[0]) {
          setClientId(payload.accounts[0].id);
          setCategoryId(payload.accounts[0].balances[0]?.category.id ?? "");
        }
      });
  }, []);

  const categories = useMemo(
    () => accounts.find((account) => account.id === clientId)?.balances ?? [],
    [accounts, clientId],
  );

  async function load() {
    const hoursRes = await fetch(
      `/api/reports?kind=hours&from=${from}&to=${to}${clientId ? `&clientId=${clientId}` : ""}`,
    );
    const hoursJson = (await hoursRes.json()) as { rows: HoursRow[] };
    setRows(hoursJson.rows ?? []);
    if (clientId && categoryId) {
      const burnRes = await fetch(
        `/api/reports?kind=burndown&from=${from}&to=${to}&clientId=${clientId}&hourCategoryId=${categoryId}`,
      );
      const burnJson = (await burnRes.json()) as {
        series: {
          points: Array<{ date: string; remaining: number }>;
          projectedZeroDate: string | null;
          velocityPerDay: number;
          remainingHours: number;
        };
      };
      setSeries(burnJson.series?.points ?? []);
      if (burnJson.series?.velocityPerDay === 0) {
        setProjection("Insufficient history for a projection.");
      } else {
        setProjection(
          `${burnJson.series.remainingHours.toFixed(2)}h remaining · ${burnJson.series.velocityPerDay.toFixed(2)}h/day · zero ${burnJson.series.projectedZeroDate ?? "n/a"}`,
        );
      }
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label>From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label>To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
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
          <label>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((row) => (
              <option key={row.category.id} value={row.category.id}>
                {row.category.name}
              </option>
            ))}
          </select>
        </div>
        <button className="rounded-md bg-white text-black px-4 py-2 text-sm" type="button" onClick={() => void load()}>
          Run
        </button>
        <a className="text-sm underline" href={`/api/export?from=${from}&to=${to}&format=csv&scope=all`}>
          Export all CSV
        </a>
        <a className="text-sm underline" href={`/api/export?from=${from}&to=${to}&format=pdf&scope=all`}>
          Export all PDF
        </a>
      </div>
      <p className="text-sm text-valere-muted">{projection}</p>
      <div className="h-64 border border-valere-border rounded-lg p-2">
        {series.length === 0 ? (
          <p className="p-6 text-valere-muted text-sm">Run a report to see burndown.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="remaining" stroke="#5b8def" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-valere-muted">
          <tr>
            <th className="py-2">Person</th>
            <th>Account</th>
            <th>Category</th>
            <th>Week</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-valere-border">
              <td className="py-2">{row.person}</td>
              <td>{row.account}</td>
              <td>{row.category}</td>
              <td>{row.week}</td>
              <td>{row.hours}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

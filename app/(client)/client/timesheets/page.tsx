"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: string;
  date: string;
  durationMinutes: number;
  description: string;
  user: { name: string };
  hourCategory: { name: string };
};

export default function ClientTimesheetsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const fromDefault = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(fromDefault);
  const [to, setTo] = useState(today);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    void fetch(`/api/time?from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((payload: { entries: Entry[] }) => setEntries(payload.entries ?? []));
  }, [from, to]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Timesheets</h1>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label>From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label>To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <a className="underline text-sm" href={`/api/export?from=${from}&to=${to}&format=csv`}>
          CSV
        </a>
        <a className="underline text-sm" href={`/api/export?from=${from}&to=${to}&format=pdf`}>
          PDF
        </a>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-valere-muted">
          <tr>
            <th className="py-2">Date</th>
            <th>Person</th>
            <th>Category</th>
            <th>Hours</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td className="py-6 text-valere-muted" colSpan={5}>
                No time in this range.
              </td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id} className="border-t border-valere-border">
                <td className="py-2">{entry.date}</td>
                <td>{entry.user.name}</td>
                <td>{entry.hourCategory.name}</td>
                <td>{(entry.durationMinutes / 60).toFixed(2)}</td>
                <td>{entry.description}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

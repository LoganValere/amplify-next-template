"use client";

import { Button } from "@/components/ui/button";
import { DataTable, TableCell, TableHead, TableRow } from "@/components/ui/data-table";
import type { TimeEntry } from "./types";

type ActionProps = {
  entry: TimeEntry;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
};

export function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(2)}h`;
}

function describeEntry(entry: TimeEntry) {
  return `${formatHours(entry.durationMinutes)} on ${entry.date} for ${entry.client.name}`;
}

function EntryActions({ entry, onEdit, onDelete }: ActionProps) {
  return (
    <div className="flex justify-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Edit ${describeEntry(entry)}`}
        onClick={() => onEdit(entry)}
      >
        Edit
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-valere-danger"
        aria-label={`Delete ${describeEntry(entry)}`}
        onClick={() => onDelete(entry)}
      >
        Delete
      </Button>
    </div>
  );
}

export function EntryList({
  entries,
  onEdit,
  onDelete,
}: {
  entries: TimeEntry[];
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
}) {
  return (
    <>
      <div className="hidden md:block">
        <DataTable>
          <caption className="sr-only">Time entries available to your role</caption>
          <thead>
            <tr>
              <TableHead>Date</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Person</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap">{entry.date}</TableCell>
                <TableCell>{entry.client.name}</TableCell>
                <TableCell>{entry.hourCategory.name}</TableCell>
                <TableCell>{entry.user.name}</TableCell>
                <TableCell className="tabular-nums">{formatHours(entry.durationMinutes)}</TableCell>
                <TableCell className="max-w-64 truncate">{entry.description || "—"}</TableCell>
                <TableCell>
                  <EntryActions entry={entry} onEdit={onEdit} onDelete={onDelete} />
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      </div>
      <ul className="grid gap-3 md:hidden">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-xl border bg-white p-4">
            <div className="flex justify-between gap-4">
              <p className="font-medium">{entry.client.name}</p>
              <p className="tabular-nums">{formatHours(entry.durationMinutes)}</p>
            </div>
            <p className="mt-1 text-xs text-valere-muted">
              {entry.date} · {entry.hourCategory.name} · {entry.user.name}
            </p>
            <p className="mt-3 text-sm">{entry.description || "No note"}</p>
            <div className="mt-4">
              <EntryActions entry={entry} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

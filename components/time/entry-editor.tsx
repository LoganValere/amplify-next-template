"use client";

import { FormEvent, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form-field";
import type { SessionUser, TimeCategory, TimeEntry } from "./types";
import { sendTimeRequest } from "./use-time-data";

type Props = {
  entry: TimeEntry;
  categories: TimeCategory[];
  user: SessionUser | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
};

export function EntryEditor({ entry, categories, user, onCancel, onSaved }: Props) {
  const [date, setDate] = useState(entry.date);
  const [hours, setHours] = useState(String(entry.durationMinutes / 60));
  const [description, setDescription] = useState(entry.description);
  const [categoryId, setCategoryId] = useState(entry.hourCategory.id);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const durationMinutes = Math.round(Number(hours) * 60);
    if (!date) return setError("Choose a date.");
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return setError("Hours must be greater than zero.");
    }
    setPending(true);
    setError("");
    try {
      await sendTimeRequest("/api/time", "PATCH", {
        id: entry.id,
        date,
        durationMinutes,
        description: description.trim(),
        hourCategoryId: user?.role === "ADMIN" ? categoryId : undefined,
      });
      await onSaved();
      onCancel();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update this entry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-valere-accent">
      <CardHeader>
        <h2 className="font-semibold">Edit time entry</h2>
        <p className="mt-1 text-sm text-valere-muted">{entry.client.name} · {entry.hourCategory.name}</p>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Input id="edit-entry-date" label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required disabled={pending} />
          <Input id="edit-entry-hours" label="Hours" type="number" min="0.01" step="0.25" value={hours} onChange={(event) => setHours(event.target.value)} required disabled={pending} />
          {user?.role === "ADMIN" ? (
            <Select
              id="edit-entry-category"
              label="Category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={pending}
              hint="Only admins can move an entry to another category."
            >
              {categories.filter((category) => category.active).map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
          ) : (
            <p className="self-end text-sm text-valere-muted">
              Category stays {entry.hourCategory.name}; only admins can change it.
            </p>
          )}
          <Textarea id="edit-entry-note" label="Work note" value={description} onChange={(event) => setDescription(event.target.value)} disabled={pending} />
          {error ? <Alert tone="danger" className="sm:col-span-2">{error}</Alert> : null}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" loading={pending}>{pending ? "Saving…" : "Save changes"}</Button>
            <Button variant="secondary" onClick={onCancel} disabled={pending}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

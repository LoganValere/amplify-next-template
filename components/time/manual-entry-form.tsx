"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form-field";
import { businessToday } from "@/lib/time/business-date";
import { timeWindowError } from "@/lib/time/time-window";
import type { SessionUser, TimeAccount, TimeCategory } from "./types";
import { sendTimeRequest } from "./use-time-data";

type Props = {
  accounts: TimeAccount[];
  categories: TimeCategory[];
  user: SessionUser | null;
  onSaved: () => Promise<void>;
};

export function ManualEntryForm({ accounts, categories, user, onSaved }: Props) {
  const trackable = useMemo(() => accounts.filter((account) => account.trackable), [accounts]);
  const activeCategories = useMemo(() => categories.filter((category) => category.active), [categories]);
  const [clientId, setClientId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(() => businessToday());
  const [hours, setHours] = useState("1");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    if (!clientId && trackable[0]) setClientId(trackable[0].id);
    if (!categoryId && activeCategories[0]) setCategoryId(activeCategories[0].id);
  }, [activeCategories, categoryId, clientId, trackable]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setMessage(null);
    const durationHours = Number(hours);
    if (!clientId) return setMessage({ tone: "danger", text: "Choose an account." });
    if (!date) return setMessage({ tone: "danger", text: "Choose a date." });
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return setMessage({ tone: "danger", text: "Hours must be greater than zero." });
    }
    const windowError = timeWindowError(startTime, endTime);
    if (windowError) return setMessage({ tone: "danger", text: windowError });
    setPending(true);
    try {
      await sendTimeRequest("/api/time", "POST", {
        clientId,
        date,
        durationHours,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        description: description.trim(),
        hourCategoryId: user?.role === "ADMIN" ? categoryId : undefined,
      });
      setDescription("");
      setStartTime("");
      setEndTime("");
      setMessage({ tone: "success", text: "Time entry saved." });
      await onSaved();
    } catch (caught) {
      setMessage({ tone: "danger", text: caught instanceof Error ? caught.message : "Could not save entry." });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">Add time manually</h2>
        <p className="mt-1 text-sm text-valere-muted">Record completed work without starting a timer.</p>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Select
            id="manual-account"
            label="Account"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            required
            disabled={pending || trackable.length === 0}
          >
            <option value="">Choose an account</option>
            {trackable.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </Select>
          <Input
            id="manual-date"
            label="Date"
            type="date"
            value={date}
            max={businessToday()}
            onChange={(event) => setDate(event.target.value)}
            required
            disabled={pending}
          />
          {user?.role === "ADMIN" ? (
            <Select
              id="manual-category"
              label="Category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
              disabled={pending}
              hint="Admins can log against any active category."
            >
              <option value="">Choose a category</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
          ) : (
            <p className="self-end text-sm text-valere-muted">
              Time is logged to the hour category on your profile.
            </p>
          )}
          <Input
            id="manual-hours"
            label="Hours"
            type="number"
            min="0.01"
            step="0.25"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            required
            disabled={pending}
          />
          <Input
            id="manual-start"
            label="Start time (optional)"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            disabled={pending}
            hint="Add both times for context; hours above set the logged duration."
          />
          <Input
            id="manual-end"
            label="End time (optional)"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            disabled={pending}
          />
          <Textarea
            id="manual-note"
            label="Work note"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="sm:col-span-2"
            disabled={pending}
          />
          <div className="space-y-3 sm:col-span-2">
            {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
            <Button type="submit" loading={pending} disabled={trackable.length === 0}>
              {pending ? "Saving…" : "Add entry"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

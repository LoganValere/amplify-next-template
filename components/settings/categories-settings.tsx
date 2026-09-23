"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form-field";
import { readPayload } from "./fields";
import type { Category } from "./types";

export function CategoriesSettings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    try {
      const payload = await fetch("/api/categories").then(readPayload);
      setCategories((payload.categories ?? []) as Category[]);
      setError("");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load categories."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setNotice("");
    try {
      const data = new FormData(event.currentTarget);
      await readPayload(await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name") }) }));
      event.currentTarget.reset(); setNotice("Hour category added."); await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to add category."); }
    finally { setLoading(false); }
  }

  return (
    <section aria-labelledby="categories-title" className="space-y-6">
      <div><h2 id="categories-title" className="text-xl font-semibold">Hour categories</h2><p className="mt-1 text-sm text-valere-muted">Create the categories used for time tracking and budgets.</p></div>
      <div aria-live="polite" className="space-y-2">{error ? <Alert tone="danger">{error}</Alert> : null}{notice ? <Alert tone="success">{notice}</Alert> : null}</div>
      <Card>
        <CardHeader><h3 className="font-semibold">Add category</h3></CardHeader>
        <CardContent><form className="flex max-w-xl flex-col items-start gap-4 sm:flex-row sm:items-end" onSubmit={create}><Input id="category-name" className="min-w-64" name="name" label="Category name" placeholder="Engineering" required /><Button type="submit" loading={loading}>Add category</Button></form></CardContent>
      </Card>
      <Card><CardHeader><h3 className="font-semibold">Existing categories</h3></CardHeader><CardContent>
        <ul className="divide-y">{categories.map((category) => <li key={category.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><span className="text-sm font-medium">{category.name}</span><Badge tone={category.active ? "success" : "neutral"}>{category.active ? "Active" : "Archived"}</Badge></li>)}</ul>
      </CardContent></Card>
    </section>
  );
}

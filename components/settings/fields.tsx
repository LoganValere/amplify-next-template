import { Select } from "@/components/ui/form-field";
import type { Account, Category } from "./types";

export function AccountSelect({ accounts, id = "client-id" }: { accounts: Account[]; id?: string }) {
  return (
    <Select id={id} name="clientId" label="Account" required>
      <option value="">Select an account</option>
      {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
    </Select>
  );
}

export function CategorySelect({ categories, id = "category-id" }: { categories: Category[]; id?: string }) {
  return (
    <Select id={id} name="hourCategoryId" label="Hour category" required>
      <option value="">Select a category</option>
      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
    </Select>
  );
}

export async function readPayload(response: Response) {
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Request failed.");
  return payload;
}

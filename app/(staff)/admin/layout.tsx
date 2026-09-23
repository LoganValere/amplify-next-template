import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/settings-nav";
import { getSession } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/overview");

  return (
    <div className="space-y-7">
      <header>
        <p className="editorial-kicker mb-2">Administration</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-valere-muted">
          Manage integrations, people, time categories, budgets, and imports.
        </p>
      </header>
      <SettingsNav />
      {children}
    </div>
  );
}

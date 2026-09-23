import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { TimerChip } from "@/components/timer-chip";
import { SignOutButton } from "@/components/sign-out-button";

const NAV = [
  { href: "/timer", label: "Timer" },
  { href: "/entries", label: "Entries" },
  { href: "/accounts", label: "Accounts" },
  { href: "/reports", label: "Reports" },
  { href: "/admin", label: "Admin" },
];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role === "CLIENT") {
    redirect("/client/timesheets");
  }
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[220px_1fr]">
      <aside className="border-b md:border-b-0 md:border-r border-valere-border p-5 bg-black">
        <p className="text-xs tracking-[0.3em] text-valere-muted">VALERE</p>
        <p className="mt-1 font-medium">Portal</p>
        <nav className="mt-8 flex md:flex-col gap-2 text-sm">
          {NAV.filter((item) => item.href !== "/admin" || session.role === "ADMIN").map((item) => (
            <Link key={item.href} href={item.href} className="text-valere-muted hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 text-xs text-valere-muted">
          <p>{session.name}</p>
          <p>{session.email}</p>
          <SignOutButton />
        </div>
      </aside>
      <div>
        <header className="border-b border-valere-border px-6 py-3 flex justify-end">
          <TimerChip />
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

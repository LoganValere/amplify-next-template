import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SignOutButton } from "@/components/sign-out-button";

const NAV = [
  { href: "/client/timesheets", label: "Timesheets" },
  { href: "/client/burndown", label: "Burndown" },
  { href: "/client/ask", label: "Ask" },
];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "CLIENT") {
    redirect("/timer");
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-valere-border px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.3em] text-valere-muted">VALERE</p>
          <p className="font-medium">Client portal</p>
        </div>
        <nav className="flex gap-4 text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-valere-muted hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="text-xs text-valere-muted">
          <p>{session.name}</p>
          <SignOutButton />
        </div>
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}

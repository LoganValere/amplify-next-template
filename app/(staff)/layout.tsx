import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { TimerChip } from "@/components/timer-chip";
import { PortalShell } from "@/components/portal-shell";

const NAV = [
  { href: "/overview", label: "Overview" },
  { href: "/timer", label: "Track" },
  { href: "/entries", label: "Time log" },
  { href: "/accounts", label: "Accounts" },
  { href: "/reports", label: "Insights" },
  { href: "/admin/integrations", label: "Settings", activePrefix: "/admin" },
];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role === "CLIENT") {
    redirect("/client/timesheets");
  }
  const navigation = NAV.filter((item) => item.href !== "/admin/integrations" || session.role === "ADMIN");

  return (
    <PortalShell
      nav={navigation}
      user={{ name: session.name, email: session.email, role: session.role }}
      portalLabel="Team portal"
      homeHref="/overview"
      utility={<TimerChip />}
    >
      {children}
    </PortalShell>
  );
}

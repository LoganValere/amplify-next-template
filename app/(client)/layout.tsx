import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { PortalShell } from "@/components/portal-shell";

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
    redirect("/overview");
  }
  return (
    <PortalShell
      nav={NAV}
      user={{ name: session.name, email: session.email, role: session.role }}
      portalLabel="Client portal"
      homeHref="/client/timesheets"
    >
      {children}
    </PortalShell>
  );
}

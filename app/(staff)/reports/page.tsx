import { InsightsDashboard } from "@/components/reports/insights-dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { getSession } from "@/lib/auth/session";
import { businessDateRange } from "@/lib/time/business-date";

export default async function ReportsPage() {
  const session = await getSession();
  const scope = session?.role === "ADMIN" ? "org" : "self";
  const { from, to } = businessDateRange(28);

  return (
    <>
      <PageHeader
        eyebrow="Reporting"
        title="Insights"
        description={
          scope === "org"
            ? "Explore organization-wide logged hours and budget trajectory in the business timezone."
            : "Explore your logged hours and account budget trajectory in the business timezone."
        }
      />
      <InsightsDashboard initialFrom={from} initialTo={to} scope={scope} />
    </>
  );
}

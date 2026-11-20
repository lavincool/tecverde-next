import { BarChart3, Inbox, PawPrint } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { loadReportMetrics } from "@/features/metrics/repository";
import { navForward } from "@/lib/navigation";
import { dashboard } from "@/messages/es-MX/dashboard";
import { requireStaffPage } from "@/server/auth/guards";
import { hasStaffPermission } from "@/server/auth/permissions";
import { db } from "@/server/db";

const copy = dashboard.home;

async function Dashboard() {
  const staff = await requireStaffPage();
  const canReports = hasStaffPermission(staff.role, { report: ["read"] });
  const canMetrics = hasStaffPermission(staff.role, { metrics: ["read"] });
  const canAdoption = hasStaffPermission(staff.role, { pet: ["moderate"] });
  const metrics = canMetrics ? await loadReportMetrics(db) : undefined;

  const tools = [
    canReports && { href: "/dashboard/reports" as const, label: copy.goToReports, icon: Inbox },
    canAdoption && {
      href: "/dashboard/adoption" as const,
      label: copy.goToAdoption,
      icon: PawPrint,
    },
    canMetrics && { href: "/dashboard/metrics" as const, label: copy.goToMetrics, icon: BarChart3 },
  ].filter((tool) => tool !== false);

  return (
    <div className="grid gap-7">
      <PageHeader title={copy.title} description={copy.description} />
      {metrics && (
        <dl className="grid gap-3 sm:grid-cols-3">
          <StatTile label={dashboard.metrics.openBacklog} value={metrics.openBacklog} />
          <StatTile label={dashboard.metrics.createdToday} value={metrics.createdToday} />
          <StatTile label={dashboard.metrics.resolvedRecent} value={metrics.resolvedLast30Days} />
        </dl>
      )}
      {tools.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {tools.map(({ href, label, icon: Icon }) => (
            <Link className="home-action" href={href} key={href} transitionTypes={navForward}>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-panel text-foreground">
                <Icon aria-hidden="true" size={21} strokeWidth={1.8} />
              </span>
              <span className="text-lg font-semibold tracking-tight">{label}</span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title={copy.empty} />
      )}
    </div>
  );
}

const loading = <SkeletonCard />;

export default function DashboardPage() {
  return (
    <Suspense fallback={loading}>
      <Dashboard />
    </Suspense>
  );
}

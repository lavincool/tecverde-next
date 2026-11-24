import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { CategoryIcon } from "@/features/catalog/category-icon";
import { PushToggle } from "@/features/notifications/components/push-toggle";
import { getDeviceReports } from "@/features/reports/queries";
import { navForward } from "@/lib/navigation";
import { common, reports } from "@/messages/es-MX";

import type { Metadata } from "next";

export const metadata: Metadata = { title: reports.mine.title, robots: { index: false } };

const formatDate = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Matamoros",
});

async function DeviceReportsContent() {
  const result = await getDeviceReports();
  if (result.status === "unavailable") {
    return (
      <EmptyState title={reports.mine.unavailableTitle} description={reports.mine.unavailable} />
    );
  }
  if (result.reports.length === 0) {
    return (
      <EmptyState
        title={reports.mine.emptyTitle}
        description={reports.mine.empty}
        icon={ClipboardList}
      />
    );
  }

  return (
    <ul className="grid gap-3">
      {result.reports.map((item) => (
        <li key={item.id}>
          <Link className="report-card" href={`/reports/${item.id}`} transitionTypes={navForward}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-background text-foreground"
                >
                  <CategoryIcon iconKey={item.categoryIconKey} size={17} strokeWidth={1.8} />
                </span>
                <span className="font-mono text-sm font-semibold">
                  {reports.formatNumber(item.number)}
                </span>
              </div>
              <StatusChip domain="report" status={item.status} />
            </div>

            <div className="grid gap-1">
              <p className="font-semibold">{item.categoryName}</p>
              <p className="text-sm text-muted">
                {reports.detail.locationSummary(item.buildingShortName, item.locationReference)}
              </p>
              <p className="line-clamp-2 text-sm leading-relaxed text-muted">{item.description}</p>
            </div>

            <time className="font-mono text-xs text-muted" dateTime={item.createdAt.toISOString()}>
              {formatDate.format(item.createdAt)}
            </time>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const loading = <SkeletonCard />;
const headerActions = (
  <Link className="button button--primary" href="/reports/new" transitionTypes={navForward}>
    <Plus aria-hidden="true" size={16} />
    {reports.mine.newReport}
  </Link>
);

export default function MyReportsPage() {
  return (
    <div className="grid gap-7">
      <PageHeader
        title={reports.mine.title}
        description={reports.mine.description}
        actions={headerActions}
      />
      <PushToggle audience="device" hint={common.push.reporterHint} />
      <Suspense fallback={loading}>
        <DeviceReportsContent />
      </Suspense>
    </div>
  );
}

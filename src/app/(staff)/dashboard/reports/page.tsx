import { Download } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { CategoryIcon } from "@/features/catalog/category-icon";
import { reportPriorities } from "@/features/reports/enums";
import { getReportInbox } from "@/features/reports/staff-queries";
import { inboxTabs } from "@/features/reports/triage";
import { navForward } from "@/lib/navigation";
import { dashboard, reports } from "@/messages/es-MX";
import { reportPriorityLabels } from "@/messages/es-MX/enums";
import { handleStaffPageError } from "@/server/auth/guards";

import type { InboxFilters } from "@/features/reports/triage";
import type { Metadata, Route } from "next";

export const metadata: Metadata = { title: dashboard.reports.title };

const copy = dashboard.reports;
const formatDate = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Matamoros",
});

function inboxHref(filters: Partial<InboxFilters>): Route {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/dashboard/reports?${query}` : "/dashboard/reports";
}

async function Inbox({ searchParams }: PageProps<"/dashboard/reports">) {
  const inbox = await getReportInbox(await searchParams).catch(handleStaffPageError);
  const { filters, catalog } = inbox;
  const baseFilters = {
    tab: filters.tab,
    category: filters.category,
    building: filters.building,
    priority: filters.priority,
  };

  return (
    <div className="grid gap-6">
      <PageHeader title={copy.title} description={copy.description}>
        {inbox.canExport && (
          <a className="button button--secondary" href="/api/reports/export" download>
            <Download aria-hidden="true" size={16} />
            {copy.export}
          </a>
        )}
      </PageHeader>

      <nav aria-label={copy.tabsLabel} className="flex flex-wrap gap-2">
        {inboxTabs.map((tab) => (
          <Link
            aria-current={filters.tab === tab ? "page" : undefined}
            className="staff-tab"
            href={inboxHref({ ...baseFilters, tab })}
            key={tab}
          >
            {copy.tabs[tab]}
          </Link>
        ))}
      </nav>

      <form className="staff-panel sm:grid-cols-4 sm:items-end" method="get">
        <input type="hidden" name="tab" value={filters.tab} />
        <label className="staff-field">
          {copy.category}
          <select className="staff-input" name="category" defaultValue={filters.category ?? ""}>
            <option value="">{copy.allCategories}</option>
            {catalog.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="staff-field">
          {copy.building}
          <select className="staff-input" name="building" defaultValue={filters.building ?? ""}>
            <option value="">{copy.allBuildings}</option>
            {catalog.buildings.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="staff-field">
          {copy.priority}
          <select className="staff-input" name="priority" defaultValue={filters.priority ?? ""}>
            <option value="">{copy.allPriorities}</option>
            {reportPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {reportPriorityLabels[priority]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="button button--primary" type="submit">
            {copy.apply}
          </button>
          <Link className="button button--ghost" href={inboxHref({ tab: filters.tab })}>
            {copy.clear}
          </Link>
        </div>
      </form>

      {inbox.reports.length === 0 ? (
        <EmptyState title={copy.emptyTitle} description={copy.empty} />
      ) : (
        <ul className="grid gap-3">
          {inbox.reports.map((item) => (
            <li key={item.id}>
              <Link
                className="report-card"
                href={`/dashboard/reports/${item.id}`}
                transitionTypes={navForward}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-semibold">
                    <CategoryIcon iconKey={item.categoryIconKey} size={17} strokeWidth={1.8} />
                    <span>{item.categoryName}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted">
                      {reportPriorityLabels[item.priority]}
                    </span>
                    <StatusChip domain="report" status={item.status} />
                  </span>
                </div>
                <p className="text-sm">
                  {reports.detail.locationSummary(item.buildingShortName, item.locationReference)}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                  <span className="font-mono">{reports.formatNumber(item.number)}</span>
                  <span>
                    {item.assigneeName ? copy.assignedTo(item.assigneeName) : copy.unassigned}
                  </span>
                  {item.confirmationsCount > 0 && (
                    <span>{copy.confirmations(item.confirmationsCount)}</span>
                  )}
                  <time className="font-mono" dateTime={item.createdAt.toISOString()}>
                    {formatDate.format(item.createdAt)}
                  </time>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        {filters.cursor && (
          <Link className="button button--ghost" href={inboxHref(baseFilters)}>
            {copy.firstPage}
          </Link>
        )}
        {inbox.nextCursor && (
          <Link
            className="button button--secondary"
            href={inboxHref({ ...baseFilters, cursor: inbox.nextCursor })}
          >
            {copy.nextPage}
          </Link>
        )}
      </div>
    </div>
  );
}

const loading = <SkeletonCard />;

export default function ReportInboxPage(props: PageProps<"/dashboard/reports">) {
  return (
    <Suspense fallback={loading}>
      <Inbox {...props} />
    </Suspense>
  );
}

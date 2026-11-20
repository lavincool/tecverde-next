import { Suspense } from "react";

import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { getReportMetrics } from "@/features/metrics/queries";
import { dashboard } from "@/messages/es-MX";
import { handleStaffPageError } from "@/server/auth/guards";

import type { ReportMetrics } from "@/features/metrics/repository";
import type { Metadata } from "next";

export const metadata: Metadata = { title: dashboard.metrics.title };

const copy = dashboard.metrics;

function BreakdownTable({
  id,
  title,
  rows,
}: {
  id: string;
  title: string;
  rows: ReportMetrics["byCategory"];
}) {
  const max = Math.max(1, ...rows.map((row) => row.total));
  const bars = rows.map((row) => ({
    ...row,
    barStyle: { width: `${(row.total / max) * 100}%`, minWidth: row.total ? "0.5rem" : 0 },
  }));
  return (
    <section aria-labelledby={id} className="staff-panel">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted">
            <th scope="col" className="py-2 font-medium">
              {copy.name}
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              {copy.total}
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              {copy.open}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {bars.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                {row.name}
                <span
                  aria-hidden="true"
                  className="mt-1.5 block h-2 rounded-full bg-accent"
                  style={row.barStyle}
                />
              </th>
              <td className="py-2.5 text-right font-mono">{row.total}</td>
              <td className="py-2.5 text-right font-mono text-muted">{row.open}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

async function Metrics() {
  const metrics = await getReportMetrics().catch(handleStaffPageError);
  const duration = (value: number | null) => (value === null ? copy.noData : copy.duration(value));

  return (
    <div className="grid gap-6">
      <PageHeader title={copy.title} description={copy.description} />
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label={copy.openBacklog} value={metrics.openBacklog} />
        <StatTile label={copy.createdToday} value={metrics.createdToday} />
        <StatTile label={copy.resolvedRecent} value={metrics.resolvedLast30Days} />
        <StatTile label={copy.averageResolution} value={duration(metrics.averageResolutionMs)} />
        <StatTile label={copy.medianResolution} value={duration(metrics.medianResolutionMs)} />
      </dl>
      <div className="grid gap-6 xl:grid-cols-2">
        <BreakdownTable id="metrics-category" title={copy.byCategory} rows={metrics.byCategory} />
        <BreakdownTable id="metrics-building" title={copy.byBuilding} rows={metrics.byBuilding} />
      </div>
    </div>
  );
}

const loading = <SkeletonCard />;

export default function MetricsPage() {
  return (
    <Suspense fallback={loading}>
      <Metrics />
    </Suspense>
  );
}

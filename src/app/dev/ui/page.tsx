import { notFound } from "next/navigation";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { petStatuses } from "@/features/adoption/enums";
import { reportStatuses } from "@/features/reports/enums";
import { common, reports } from "@/messages/es-MX";

export default function UiGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto grid max-w-3xl gap-8 p-6">
      <PageHeader title={common.ui.title} description={common.ui.description} />
      <section aria-labelledby="report-states" className="grid gap-3">
        <h2 id="report-states" className="text-xl font-semibold">
          {common.ui.reports}
        </h2>
        <div className="flex flex-wrap gap-2">
          {reportStatuses.map((status) => (
            <StatusChip key={status} domain="report" status={status} />
          ))}
        </div>
      </section>
      <section aria-labelledby="pet-states" className="grid gap-3">
        <h2 id="pet-states" className="text-xl font-semibold">
          {common.ui.pets}
        </h2>
        <div className="flex flex-wrap gap-2">
          {petStatuses.map((status) => (
            <StatusChip key={status} domain="pet" status={status} />
          ))}
        </div>
      </section>
      <section aria-labelledby="empty-state" className="grid gap-3">
        <h2 id="empty-state" className="text-xl font-semibold">
          {common.ui.empty}
        </h2>
        <EmptyState title={reports.mine.emptyTitle} description={reports.mine.empty} />
      </section>
      <section aria-labelledby="loading-state" className="grid gap-3">
        <h2 id="loading-state" className="text-xl font-semibold">
          {common.ui.loading}
        </h2>
        <SkeletonCard />
      </section>
    </main>
  );
}

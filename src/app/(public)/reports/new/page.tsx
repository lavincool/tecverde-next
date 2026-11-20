import { ClipboardPlus } from "lucide-react";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { NewReportForm } from "@/features/reports/components/new-report-form";
import { getReportCatalog } from "@/features/reports/queries";
import { reports } from "@/messages/es-MX";

import type { Metadata } from "next";

export const metadata: Metadata = { title: reports.new.title };

async function NewReportContent() {
  const catalog = await getReportCatalog();
  if (catalog.status === "unavailable") {
    return (
      <EmptyState
        title={reports.new.unavailableTitle}
        description={reports.new.unavailable}
        icon={ClipboardPlus}
      />
    );
  }
  if (catalog.status === "empty") {
    return (
      <EmptyState
        title={reports.new.catalogEmptyTitle}
        description={reports.new.catalogEmpty}
        icon={ClipboardPlus}
      />
    );
  }
  return <NewReportForm categories={catalog.categories} buildings={catalog.buildings} />;
}

const loading = <SkeletonCard />;

export default function NewReportPage() {
  return (
    <div className="grid gap-7">
      <PageHeader title={reports.new.title} description={reports.new.description} />
      <Suspense fallback={loading}>
        <NewReportContent />
      </Suspense>
    </div>
  );
}

import { ClipboardPlus } from "lucide-react";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { NewReportForm } from "@/features/reports/components/new-report-form";
import { getReportCatalog } from "@/features/reports/queries";
import { reports } from "@/messages/es-MX";
import { isStorageConfigured } from "@/server/storage/r2";

import type { Metadata } from "next";

export const metadata: Metadata = { title: reports.new.title };

async function NewReportContent({ searchParams }: PageProps<"/reports/new">) {
  const { building } = await searchParams;
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
  const buildingSlug = Array.isArray(building) ? building[0] : building;
  const initialBuildingId = catalog.buildings.find((item) => item.slug === buildingSlug)?.id ?? "";
  return (
    <NewReportForm
      categories={catalog.categories}
      buildings={catalog.buildings}
      initialBuildingId={initialBuildingId}
      uploadsEnabled={isStorageConfigured()}
    />
  );
}

const loading = <SkeletonCard />;

export default function NewReportPage(props: PageProps<"/reports/new">) {
  return (
    <div className="grid gap-7">
      <PageHeader title={reports.new.title} description={reports.new.description} />
      <Suspense fallback={loading}>
        <NewReportContent {...props} />
      </Suspense>
    </div>
  );
}

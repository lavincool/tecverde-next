import { ClipboardPlus } from "lucide-react";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { NewReportForm } from "@/features/reports/components/new-report-form";
import { getReportCatalog } from "@/features/reports/queries";
import { parseReportTopic, resolveReportFormFocus } from "@/features/reports/topics";
import { reports } from "@/messages/es-MX";
import { isStorageConfigured } from "@/server/storage/r2";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: reports.new.title };

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function NewReportContent({ searchParams }: PageProps<"/reports/new">) {
  const params = await searchParams;
  const topic = parseReportTopic(params.topic);
  const header = topic ? reports.topics[topic] : reports.new;
  const catalog = await getReportCatalog();

  let content: ReactNode;
  if (catalog.status === "unavailable") {
    content = (
      <EmptyState
        title={reports.new.unavailableTitle}
        description={reports.new.unavailable}
        icon={ClipboardPlus}
      />
    );
  } else if (catalog.status === "empty") {
    content = (
      <EmptyState
        title={reports.new.catalogEmptyTitle}
        description={reports.new.catalogEmpty}
        icon={ClipboardPlus}
      />
    );
  } else {
    const buildingSlug = firstValue(params.building);
    const focus = resolveReportFormFocus(catalog.categories, {
      topic,
      categorySlug: firstValue(params.category),
    });
    content = (
      <NewReportForm
        categories={catalog.categories}
        buildings={catalog.buildings}
        focusCategoryIds={focus.categoryIds}
        initialCategoryId={focus.initialCategoryId}
        initialBuildingId={catalog.buildings.find((item) => item.slug === buildingSlug)?.id ?? ""}
        topic={topic}
        uploadsEnabled={isStorageConfigured()}
      />
    );
  }

  return (
    <>
      <PageHeader title={header.title} description={header.description} />
      {content}
    </>
  );
}

const loading = (
  <>
    <PageHeader title={reports.new.title} description={reports.new.description} />
    <SkeletonCard />
  </>
);

export default function NewReportPage(props: PageProps<"/reports/new">) {
  return (
    <div className="grid gap-7">
      <Suspense fallback={loading}>
        <NewReportContent {...props} />
      </Suspense>
    </div>
  );
}

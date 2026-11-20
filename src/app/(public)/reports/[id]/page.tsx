import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { ReportDetail } from "@/features/reports/components/report-detail";
import { getReportForViewer } from "@/features/reports/queries";
import { reports } from "@/messages/es-MX";

import type { Metadata } from "next";

export const metadata: Metadata = { title: reports.detail.title, robots: { index: false } };

async function ViewerReport({ params }: PageProps<"/reports/[id]">) {
  const { id } = await params;
  const record = await getReportForViewer(id);
  if (!record) notFound();

  return (
    <ReportDetail report={record} backHref="/reports/mine" backLabel={reports.detail.backToMine} />
  );
}

const loading = <SkeletonCard />;

export default function ReportDetailPage(props: PageProps<"/reports/[id]">) {
  return (
    <div className="grid gap-7">
      <PageHeader title={reports.detail.title} />
      <Suspense fallback={loading}>
        <ViewerReport {...props} />
      </Suspense>
    </div>
  );
}

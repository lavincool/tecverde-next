import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { ReportDetail } from "@/features/reports/components/report-detail";
import { getReportByTrackingToken } from "@/features/reports/queries";
import { navBack } from "@/lib/navigation";
import { reports } from "@/messages/es-MX";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: reports.track.title,
  robots: { index: false },
  referrer: "no-referrer",
};

async function TrackedReport({ params }: PageProps<"/reports/track/[token]">) {
  const { token } = await params;
  const record = await getReportByTrackingToken(token);
  if (!record) {
    return (
      <EmptyState title={reports.track.invalidTitle} description={reports.track.invalidDescription}>
        <Link className="button button--primary" href="/" transitionTypes={navBack}>
          {reports.detail.backToHome}
        </Link>
      </EmptyState>
    );
  }

  return <ReportDetail report={record} backHref="/" backLabel={reports.detail.backToHome} />;
}

const loading = <SkeletonCard />;

export default function TrackReportPage(props: PageProps<"/reports/track/[token]">) {
  return (
    <div className="grid gap-7">
      <PageHeader title={reports.track.title} description={reports.track.description} />
      <Suspense fallback={loading}>
        <TrackedReport {...props} />
      </Suspense>
    </div>
  );
}

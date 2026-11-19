import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { nav, reports } from "@/messages/es-MX";

import type { Metadata } from "next";

export const metadata: Metadata = { title: reports.mine.title, robots: { index: false } };

export default function MyReportsPage() {
  return (
    <div className="grid gap-7">
      <PageHeader title={reports.mine.title} description={reports.mine.description} />
      <EmptyState title={reports.mine.emptyTitle} description={reports.mine.empty}>
        <Link className="button button--primary" href="/reports/new">
          {nav.report}
        </Link>
      </EmptyState>
    </div>
  );
}

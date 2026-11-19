import { ClipboardPlus } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { reports } from "@/messages/es-MX";

import type { Metadata } from "next";

export const metadata: Metadata = { title: reports.new.title };

export default function NewReportPage() {
  return (
    <div className="grid gap-7">
      <PageHeader title={reports.new.title} description={reports.new.description} />
      <EmptyState title={reports.new.empty} icon={ClipboardPlus} />
    </div>
  );
}

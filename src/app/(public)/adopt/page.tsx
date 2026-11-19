import { PawPrint } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { adoption } from "@/messages/es-MX";

import type { Metadata } from "next";

export const metadata: Metadata = { title: adoption.gallery.title };

export default function AdoptionPage() {
  return (
    <div className="grid gap-7">
      <PageHeader title={adoption.gallery.title} description={adoption.gallery.description} />
      <EmptyState
        title={adoption.gallery.emptyTitle}
        description={adoption.gallery.empty}
        icon={PawPrint}
      />
    </div>
  );
}

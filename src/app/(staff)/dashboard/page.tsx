import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { dashboard } from "@/messages/es-MX/dashboard";
import { requireStaffPage } from "@/server/auth/guards";

async function Dashboard() {
  await requireStaffPage();
  return (
    <div className="grid gap-7">
      <PageHeader title={dashboard.home.title} description={dashboard.home.description} />
      <EmptyState title={dashboard.home.empty} />
    </div>
  );
}

const loading = <SkeletonCard />;

export default function DashboardPage() {
  return (
    <Suspense fallback={loading}>
      <Dashboard />
    </Suspense>
  );
}

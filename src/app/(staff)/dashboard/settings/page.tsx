import { Suspense } from "react";

import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { AccountSettings } from "@/features/staff/components/account-settings";
import { dashboard } from "@/messages/es-MX/dashboard";
import { requireStaffPage } from "@/server/auth/guards";

async function Settings() {
  const staff = await requireStaffPage(undefined, true);
  return (
    <AccountSettings enabled={staff.twoFactorEnabled} requiredTwoFactor={staff.role === "admin"} />
  );
}

const loading = <SkeletonCard />;

export default function SettingsPage() {
  return (
    <div className="grid gap-7">
      <PageHeader title={dashboard.settings.title} />
      <Suspense fallback={loading}>
        <Settings />
      </Suspense>
    </div>
  );
}

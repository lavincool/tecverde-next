import { Suspense } from "react";

import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { PushToggle } from "@/features/notifications/components/push-toggle";
import { AccountSettings } from "@/features/staff/components/account-settings";
import { common } from "@/messages/es-MX/common";
import { dashboard } from "@/messages/es-MX/dashboard";
import { requireStaffPage } from "@/server/auth/guards";

async function Settings() {
  const staff = await requireStaffPage(undefined, true);
  return (
    <div className="grid gap-6">
      <AccountSettings
        enabled={staff.twoFactorEnabled}
        requiredTwoFactor={staff.role === "admin"}
      />
      <section aria-labelledby="push-settings" className="staff-panel">
        <h2 className="text-xl font-semibold" id="push-settings">
          {common.push.staffTitle}
        </h2>
        <PushToggle audience="staff" hint={common.push.staffHint} />
      </section>
    </div>
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

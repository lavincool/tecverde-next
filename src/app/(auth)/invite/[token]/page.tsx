import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { AcceptInviteForm } from "@/features/staff/components/accept-invite-form";
import { getInvite } from "@/features/staff/queries";
import { dashboard } from "@/messages/es-MX/dashboard";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: dashboard.invite.title,
  robots: { index: false },
  referrer: "no-referrer",
};

async function Invite({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const invite = await getInvite(token);
  return invite ? (
    <AcceptInviteForm token={token} />
  ) : (
    <EmptyState title={dashboard.invite.invalid} />
  );
}

const loading = <SkeletonCard />;

export default function InvitePage(props: PageProps<"/invite/[token]">) {
  return (
    <div className="grid gap-7">
      <PageHeader title={dashboard.invite.title} description={dashboard.invite.description} />
      <Suspense fallback={loading}>
        <Invite {...props} />
      </Suspense>
    </div>
  );
}

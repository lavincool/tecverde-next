import { MailX } from "lucide-react";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmEmailForm } from "@/features/notifications/components/confirm-email-form";
import { isPendingActionToken } from "@/features/notifications/queries";
import { common } from "@/messages/es-MX";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: common.verify.title,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function Verification({ params }: PageProps<"/verify/[token]">) {
  const { token } = await params;
  // The token is only consumed on an explicit click, so mail scanners that prefetch links
  // cannot confirm an address on the owner's behalf.
  if (!(await isPendingActionToken(token))) {
    return (
      <EmptyState
        title={common.verify.invalidTitle}
        description={common.verify.invalid}
        icon={MailX}
      />
    );
  }
  return <ConfirmEmailForm token={token} />;
}

const loading = <SkeletonCard />;

export default function VerifyPage(props: PageProps<"/verify/[token]">) {
  return (
    <div className="grid gap-7">
      <PageHeader title={common.verify.title} />
      <Suspense fallback={loading}>
        <Verification {...props} />
      </Suspense>
    </div>
  );
}

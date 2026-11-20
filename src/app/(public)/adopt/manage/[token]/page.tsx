import { KeyRound } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { PosterStatusForm, PosterStoryForm } from "@/features/adoption/components/manage-forms";
import { RequestList } from "@/features/adoption/components/request-list";
import { getManagedPet } from "@/features/adoption/queries";
import { adoption } from "@/messages/es-MX";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: adoption.manage.title,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const copy = adoption.manage;

async function Manage({ params }: PageProps<"/adopt/manage/[token]">) {
  const { token } = await params;
  const pet = await getManagedPet(token);
  if (!pet) {
    return <EmptyState description={copy.invalid} icon={KeyRound} title={copy.invalidTitle} />;
  }
  let notice: string | undefined;
  if (!pet.posterEmailVerifiedAt) notice = copy.pendingVerification;
  else if (pet.status === "pending_approval") notice = copy.pendingApproval;
  else if (pet.status === "archived" && pet.rejectionReason) notice = copy.rejected;

  return (
    <div className="grid gap-6">
      <section aria-labelledby="manage-status" className="report-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight" id="manage-status">
            {pet.name}
          </h2>
          <StatusChip domain="pet" status={pet.status} />
        </div>
        {notice && <p className="text-muted">{notice}</p>}
        {pet.rejectionReason && pet.status === "archived" && (
          <p className="text-sm">
            <span className="font-medium">{copy.reason}</span>
            <span className="block whitespace-pre-wrap">{pet.rejectionReason}</span>
          </p>
        )}
        {pet.approvedAt && (
          <Link className="underline" href={`/adopt/${pet.slug}`}>
            {copy.view}
          </Link>
        )}
      </section>
      {pet.approvedAt && (
        <section aria-labelledby="manage-change" className="report-panel">
          <h2 className="text-lg font-semibold" id="manage-change">
            {copy.changeStatus}
          </h2>
          <PosterStatusForm token={token} transitions={pet.transitions} />
        </section>
      )}
      {pet.status === "adopted" && (
        <section className="report-panel" aria-label={copy.successStory}>
          <PosterStoryForm story={pet.successStory} token={token} />
        </section>
      )}
      <section aria-labelledby="manage-requests" className="report-panel">
        <h2 className="text-lg font-semibold" id="manage-requests">
          {copy.requests}
        </h2>
        <RequestList posterToken={token} requests={pet.requests} />
      </section>
    </div>
  );
}

const loading = <SkeletonCard />;

export default function ManagePage(props: PageProps<"/adopt/manage/[token]">) {
  return (
    <div className="grid gap-7">
      <PageHeader title={copy.title} description={copy.description} />
      <Suspense fallback={loading}>
        <Manage {...props} />
      </Suspense>
    </div>
  );
}

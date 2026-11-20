import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { getOpenRequests } from "@/features/adoption/queries";
import { navBack } from "@/lib/navigation";
import { adoption, common } from "@/messages/es-MX";
import { requestStatusLabels } from "@/messages/es-MX/enums";
import { handleStaffPageError } from "@/server/auth/guards";

import type { Metadata } from "next";

export const metadata: Metadata = { title: adoption.staff.requestsTitle };

const copy = adoption.staff;
const formatDate = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Matamoros",
});

async function Requests() {
  const requests = await getOpenRequests().catch(handleStaffPageError);
  if (requests.length === 0) return <EmptyState title={copy.requestsEmpty} />;
  return (
    <ul className="staff-panel grid divide-y divide-line">
      {requests.map((request) => (
        <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={request.id}>
          <div>
            <p className="font-medium">{request.petName}</p>
            <p className="text-sm text-muted">
              {request.fullName}
              <span aria-hidden="true">{common.separator}</span>
              {requestStatusLabels[request.status]}
              <span aria-hidden="true">{common.separator}</span>
              <time dateTime={request.createdAt.toISOString()}>
                {formatDate.format(request.createdAt)}
              </time>
            </p>
          </div>
          <Link
            className="button button--secondary button--sm"
            href={`/dashboard/adoption/${request.petId}`}
          >
            {copy.review}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const loading = <SkeletonCard />;

export default function RequestsPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title={copy.requestsTitle} description={copy.requestsDescription} />
      <Suspense fallback={loading}>
        <Requests />
      </Suspense>
      <Link
        className="button button--secondary justify-self-start"
        href="/dashboard/adoption"
        transitionTypes={navBack}
      >
        {copy.back}
      </Link>
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { getModerationOverview } from "@/features/adoption/queries";
import { navForward } from "@/lib/navigation";
import { adoption, common } from "@/messages/es-MX";
import { speciesLabels } from "@/messages/es-MX/enums";
import { handleStaffPageError } from "@/server/auth/guards";

import type { Metadata } from "next";

export const metadata: Metadata = { title: adoption.staff.title };

const copy = adoption.staff;
const formatDate = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeZone: "America/Matamoros",
});

async function Moderation() {
  const { queue, pets } = await getModerationOverview().catch(handleStaffPageError);
  return (
    <div className="grid gap-6">
      <PageHeader title={copy.title} description={copy.description}>
        <Link className="button button--secondary" href="/dashboard/adoption/requests">
          {copy.requests}
        </Link>
      </PageHeader>
      <section aria-labelledby="moderation-queue" className="staff-panel">
        <h2 className="text-xl font-semibold" id="moderation-queue">
          {copy.queue}
        </h2>
        {queue.length === 0 ? (
          <p className="text-muted">{copy.queueEmpty}</p>
        ) : (
          <ul className="grid divide-y divide-line">
            {queue.map((item) => (
              <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={item.id}>
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted">
                    {speciesLabels[item.species]}
                    <span aria-hidden="true">{common.separator}</span>
                    <time dateTime={item.createdAt.toISOString()}>
                      {formatDate.format(item.createdAt)}
                    </time>
                  </p>
                </div>
                <Link
                  className="button button--primary button--sm"
                  href={`/dashboard/adoption/${item.id}`}
                  transitionTypes={navForward}
                >
                  {copy.review}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="moderation-pets" className="grid gap-3">
        <h2 className="text-xl font-semibold" id="moderation-pets">
          {copy.pets}
        </h2>
        {pets.length === 0 ? (
          <EmptyState title={copy.petsEmpty} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {pets.map((item) => (
              <li key={item.id}>
                <Link
                  className="report-card"
                  href={`/dashboard/adoption/${item.id}`}
                  transitionTypes={navForward}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{item.name}</span>
                    <StatusChip domain="pet" status={item.status} />
                  </span>
                  <span className="text-sm text-muted">
                    {item.openRequests > 0
                      ? copy.openRequests(item.openRequests)
                      : speciesLabels[item.species]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const loading = <SkeletonCard />;

export default function ModerationPage() {
  return (
    <Suspense fallback={loading}>
      <Moderation />
    </Suspense>
  );
}

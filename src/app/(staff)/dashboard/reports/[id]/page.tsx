import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { CategoryIcon } from "@/features/catalog/category-icon";
import {
  AssignForm,
  CommentForm,
  DeleteReportForm,
  DuplicateForm,
  PriorityForm,
  ResolveForm,
  StatusForm,
} from "@/features/reports/components/staff/triage-forms";
import { getTriageReport } from "@/features/reports/staff-queries";
import { navBack } from "@/lib/navigation";
import { dashboard, reports } from "@/messages/es-MX";
import { reportPriorityLabels, reportStatusLabels } from "@/messages/es-MX/enums";
import { handleStaffPageError } from "@/server/auth/guards";

import type { Metadata } from "next";

export const metadata: Metadata = { title: dashboard.reports.detail.title };

const copy = dashboard.reports.detail;
const formatDate = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Matamoros",
});

async function TriageView({ params }: PageProps<"/dashboard/reports/[id]">) {
  const { id } = await params;
  const data = await getTriageReport(id).catch(handleStaffPageError);
  if (!data) notFound();
  const { report, assignable, transitions, can } = data;

  return (
    <div className="grid gap-6">
      <PageHeader title={reports.formatNumber(report.number)}>
        <StatusChip domain="report" status={report.status} />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-6">
          <section aria-labelledby="triage-summary" className="staff-panel">
            <h2 id="triage-summary" className="sr-only">
              {reports.detail.title}
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1">
                <dt className="text-sm text-muted">{reports.detail.category}</dt>
                <dd className="flex items-center gap-2 font-medium">
                  <CategoryIcon iconKey={report.categoryIconKey} size={17} strokeWidth={1.8} />
                  <span>{report.categoryName}</span>
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-sm text-muted">{reports.detail.building}</dt>
                <dd className="font-medium">{report.buildingName}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-sm text-muted">{reports.detail.location}</dt>
                <dd className="font-medium">{report.locationReference}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-sm text-muted">{reports.detail.createdAt}</dt>
                <dd className="font-mono text-sm">
                  <time dateTime={report.createdAt.toISOString()}>
                    {formatDate.format(report.createdAt)}
                  </time>
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-sm text-muted">{reports.detail.priority}</dt>
                <dd className="font-medium">{reportPriorityLabels[report.priority]}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-sm text-muted">{copy.assignee}</dt>
                <dd className="font-medium">
                  {report.assigneeName ?? dashboard.reports.unassigned}
                </dd>
              </div>
            </dl>
            {report.confirmationsCount > 0 && (
              <p className="text-sm text-muted">
                {dashboard.reports.confirmations(report.confirmationsCount)}
              </p>
            )}
            {report.duplicateOfId && report.duplicateOfNumber && (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span>{copy.duplicateOf(report.duplicateOfNumber)}</span>
                <Link className="underline" href={`/dashboard/reports/${report.duplicateOfId}`}>
                  {copy.openDuplicateTarget}
                </Link>
              </p>
            )}
            <div className="grid gap-1.5 border-t border-line pt-4">
              <h3 className="text-sm font-semibold text-muted">{reports.detail.description}</h3>
              <p className="max-w-prose leading-relaxed whitespace-pre-wrap">
                {report.description}
              </p>
            </div>
            {report.resolutionNote && (
              <div className="grid gap-1.5 border-t border-line pt-4">
                <h3 className="text-sm font-semibold text-muted">{reports.detail.resolution}</h3>
                <p className="max-w-prose leading-relaxed whitespace-pre-wrap">
                  {report.resolutionNote}
                </p>
              </div>
            )}
          </section>

          <section aria-labelledby="triage-reporter" className="staff-panel">
            <h2 id="triage-reporter" className="text-lg font-semibold">
              {copy.reporter}
            </h2>
            {report.reporterName || report.reporterEmail ? (
              <div className="grid gap-1">
                {report.reporterName && <p className="font-medium">{report.reporterName}</p>}
                {report.reporterEmail && (
                  <p className="flex flex-wrap gap-x-2 text-sm">
                    <a className="break-all underline" href={`mailto:${report.reporterEmail}`}>
                      {report.reporterEmail}
                    </a>
                    <span className="text-muted">
                      {report.reporterEmailVerifiedAt ? copy.emailVerified : copy.emailUnverified}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted">{copy.anonymous}</p>
            )}
          </section>

          <section aria-labelledby="triage-timeline" className="staff-panel">
            <h2 id="triage-timeline" className="text-lg font-semibold">
              {copy.timeline}
            </h2>
            <ol className="grid divide-y divide-line">
              {report.events.map((event) => (
                <li
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  key={event.id}
                >
                  <div className="grid gap-0.5">
                    <p className="font-medium">{reportStatusLabels[event.toStatus]}</p>
                    <p className="text-sm text-muted">
                      {event.actorName ??
                        (event.actorUserId ? dashboard.staff.deleted : copy.system)}
                    </p>
                    {event.note && <p className="text-sm">{event.note}</p>}
                  </div>
                  <time
                    className="font-mono text-sm text-muted"
                    dateTime={event.createdAt.toISOString()}
                  >
                    {formatDate.format(event.createdAt)}
                  </time>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="triage-comments" className="staff-panel">
            <div>
              <h2 id="triage-comments" className="text-lg font-semibold">
                {copy.comments}
              </h2>
              <p className="text-sm text-muted">{copy.commentsHint}</p>
            </div>
            {report.comments.length > 0 ? (
              <ul className="grid divide-y divide-line">
                {report.comments.map((comment) => (
                  <li className="grid gap-1 py-3 first:pt-0" key={comment.id}>
                    <p className="flex flex-wrap justify-between gap-2 text-sm text-muted">
                      <span className="font-medium text-foreground">
                        {comment.authorName ?? dashboard.staff.deleted}
                      </span>
                      <time className="font-mono" dateTime={comment.createdAt.toISOString()}>
                        {formatDate.format(comment.createdAt)}
                      </time>
                    </p>
                    <p className="leading-relaxed whitespace-pre-wrap">{comment.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">{copy.noComments}</p>
            )}
            {can.triage && <CommentForm reportId={report.id} />}
          </section>
        </div>

        <aside aria-labelledby="triage-tools" className="grid content-start gap-4">
          <h2 id="triage-tools" className="sr-only">
            {copy.triage}
          </h2>
          {can.triage && (
            <section className="staff-panel" aria-labelledby="triage-status">
              <h3 id="triage-status" className="font-semibold">
                {copy.status}
              </h3>
              <StatusForm reportId={report.id} transitions={transitions} />
            </section>
          )}
          {can.resolve && transitions.includes("resolved") && (
            <section className="staff-panel" aria-labelledby="triage-resolve">
              <h3 id="triage-resolve" className="font-semibold">
                {copy.resolve}
              </h3>
              <ResolveForm reportId={report.id} />
            </section>
          )}
          {can.assign && (
            <section className="staff-panel" aria-label={copy.assignee}>
              <AssignForm reportId={report.id} assigneeId={report.assigneeId} staff={assignable} />
            </section>
          )}
          {can.triage && (
            <section className="staff-panel" aria-label={copy.priority}>
              <PriorityForm reportId={report.id} priority={report.priority} />
            </section>
          )}
          {can.triage && transitions.includes("duplicate") && (
            <section className="staff-panel" aria-labelledby="triage-duplicate">
              <h3 id="triage-duplicate" className="font-semibold">
                {copy.duplicate}
              </h3>
              <DuplicateForm reportId={report.id} />
            </section>
          )}
          {can.delete && (
            <section className="staff-panel" aria-labelledby="triage-delete">
              <h3 id="triage-delete" className="font-semibold">
                {copy.delete}
              </h3>
              <DeleteReportForm reportId={report.id} />
            </section>
          )}
        </aside>
      </div>

      <Link
        className="button button--secondary justify-self-start"
        href="/dashboard/reports"
        transitionTypes={navBack}
      >
        {dashboard.reports.backToInbox}
      </Link>
    </div>
  );
}

const loading = <SkeletonCard />;

export default function TriagePage(props: PageProps<"/dashboard/reports/[id]">) {
  return (
    <Suspense fallback={loading}>
      <TriageView {...props} />
    </Suspense>
  );
}

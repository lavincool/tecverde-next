import Link from "next/link";

import { StatusChip } from "@/components/ui/status-chip";
import { CategoryIcon } from "@/features/catalog/category-icon";
import { PrivatePhotos } from "@/features/media/components/private-photos";
import { navBack, navForward } from "@/lib/navigation";
import { reportPriorityLabels, reportStatusLabels } from "@/messages/es-MX/enums";
import { media } from "@/messages/es-MX/media";
import { reports } from "@/messages/es-MX/reports";

import type { ReportViewerData } from "../queries";

const copy = reports.detail;

const formatDate = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Matamoros",
});

export function ReportDetail({
  report,
  backHref,
  backLabel,
}: {
  report: ReportViewerData;
  backHref: "/" | "/reports/mine";
  backLabel: string;
}) {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="report-summary-heading" className="report-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="report-summary-heading" className="text-2xl font-semibold tracking-tight">
              {reports.formatNumber(report.number)}
            </h2>
            <StatusChip domain="report" status={report.status} />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <span className="font-medium text-foreground">{copy.priority}</span>
            <span>{reportPriorityLabels[report.priority]}</span>
          </p>
        </div>

        <dl className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <div className="grid gap-1">
            <dt className="text-sm text-muted">{copy.category}</dt>
            <dd className="flex items-center gap-2 font-medium">
              <CategoryIcon iconKey={report.category.iconKey} size={17} strokeWidth={1.8} />
              <span>{report.category.name}</span>
            </dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-sm text-muted">{copy.building}</dt>
            <dd className="font-medium">{report.building.name}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-sm text-muted">{copy.location}</dt>
            <dd className="font-medium">{report.locationReference}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-sm text-muted">{copy.createdAt}</dt>
            <dd className="font-mono text-sm">
              <time dateTime={report.createdAt.toISOString()}>
                {formatDate.format(report.createdAt)}
              </time>
            </dd>
          </div>
        </dl>

        <div className="grid gap-1.5 border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-muted">{copy.description}</h3>
          <p className="max-w-prose leading-relaxed whitespace-pre-wrap">{report.description}</p>
        </div>

        {report.resolutionNote && (
          <div className="grid gap-1.5 border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-muted">{copy.resolution}</h3>
            <p className="max-w-prose leading-relaxed whitespace-pre-wrap">
              {report.resolutionNote}
            </p>
            <PrivatePhotos
              photos={report.afterPhotos}
              label={copy.resolution}
              altFor={media.gallery.afterPhoto}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="report-timeline-heading" className="report-panel">
        <h2 id="report-timeline-heading" className="text-xl font-semibold tracking-tight">
          {copy.timeline}
        </h2>
        <ol className="grid divide-y divide-line">
          {report.events.map((event) => {
            const eventNote =
              event.note ?? (event.fromStatus === null ? copy.initialEvent : undefined);
            return (
              <li
                className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0"
                key={event.id}
              >
                <div className="grid gap-0.5">
                  <p className="font-medium">{reportStatusLabels[event.toStatus]}</p>
                  {eventNote && <p className="text-sm text-muted">{eventNote}</p>}
                </div>
                <time
                  className="font-mono text-sm text-muted"
                  dateTime={event.createdAt.toISOString()}
                >
                  {formatDate.format(event.createdAt)}
                </time>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link className="button button--secondary" href={backHref} transitionTypes={navBack}>
          {backLabel}
        </Link>
        <Link className="button button--primary" href="/reports/new" transitionTypes={navForward}>
          {copy.newReport}
        </Link>
      </div>
    </div>
  );
}

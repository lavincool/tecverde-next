import { AirVent, Droplets, Toilet, Trash2 } from "lucide-react";
import Link from "next/link";

import { navForward } from "@/lib/navigation";
import { reports } from "@/messages/es-MX/reports";

import { reportTopicKeys } from "../topics";

import type { ReportTopicKey } from "../topics";
import type { LucideIcon } from "lucide-react";

const topicIcons = {
  restroom: Toilet,
  trash: Trash2,
  water: Droplets,
  air: AirVent,
} as const satisfies Record<ReportTopicKey, LucideIcon>;

/** One-tap entry points into the report form, narrowed to the most common campus problems. */
export function QuickReportLinks() {
  return (
    <ul className="quick-report-grid">
      {reportTopicKeys.map((topic) => {
        const Icon = topicIcons[topic];
        const copy = reports.topics[topic];
        return (
          <li key={topic}>
            <Link
              className="quick-report-tile"
              href={`/reports/new?topic=${topic}`}
              transitionTypes={navForward}
            >
              <span aria-hidden="true" className="quick-report-icon">
                <Icon size={22} strokeWidth={1.8} />
              </span>
              <span className="grid gap-0.5">
                <span className="leading-tight font-semibold">{copy.label}</span>
                <span className="text-sm leading-snug text-muted">{copy.hint}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

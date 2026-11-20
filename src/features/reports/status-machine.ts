import type { ReportStatus } from "./enums";
import type { StaffRole } from "@/features/staff/enums";

const staffTransitions = {
  open: ["in_review", "in_progress", "dismissed", "duplicate"],
  in_review: ["in_progress", "dismissed", "duplicate", "open"],
  in_progress: ["resolved", "in_review"],
  resolved: ["in_progress"],
  dismissed: [],
  duplicate: [],
} as const satisfies Record<ReportStatus, readonly ReportStatus[]>;

const adminTransitions = {
  dismissed: ["open"],
  duplicate: ["open"],
} as const satisfies Partial<Record<ReportStatus, readonly ReportStatus[]>>;

/** Statuses that need a dedicated action with extra data instead of a plain status change. */
export const guardedTargets = ["resolved", "duplicate"] as const satisfies readonly ReportStatus[];

export const closedReportStatuses = [
  "resolved",
  "dismissed",
  "duplicate",
] as const satisfies readonly ReportStatus[];

export function nextReportStatuses(from: ReportStatus, role: StaffRole): ReportStatus[] {
  const base: readonly ReportStatus[] = staffTransitions[from];
  if (role !== "admin") return [...base];
  const extra: readonly ReportStatus[] =
    from === "dismissed" || from === "duplicate" ? adminTransitions[from] : [];
  return [...base, ...extra];
}

export function canTransitionReport(from: ReportStatus, to: ReportStatus, role: StaffRole) {
  return nextReportStatuses(from, role).includes(to);
}

export function isClosedReportStatus(status: ReportStatus) {
  return closedReportStatuses.some((closed) => closed === status);
}

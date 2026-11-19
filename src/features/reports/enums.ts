export const reportStatuses = [
  "open",
  "in_review",
  "in_progress",
  "resolved",
  "dismissed",
  "duplicate",
] as const;
export const reportPriorities = ["low", "normal", "high", "urgent"] as const;
export type ReportStatus = (typeof reportStatuses)[number];
export type ReportPriority = (typeof reportPriorities)[number];

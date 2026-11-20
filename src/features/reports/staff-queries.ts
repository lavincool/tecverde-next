import "server-only";

import { dashboard } from "@/messages/es-MX/dashboard";
import { reportPriorityLabels, reportStatusLabels } from "@/messages/es-MX/enums";
import { requireStaff } from "@/server/auth/guards";
import { hasStaffPermission } from "@/server/auth/permissions";
import { db } from "@/server/db";

import { listReportsForExport, toCsv } from "./export";
import { listActiveCatalog } from "./repository";
import { reportIdSchema } from "./schema";
import { nextReportStatuses } from "./status-machine";
import {
  findTriageReport,
  inboxFiltersSchema,
  listAssignableStaff,
  listInboxReports,
} from "./triage";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function getReportInbox(searchParams: Record<string, string | string[] | undefined>) {
  const staff = await requireStaff({ report: ["read"] });
  const filters = inboxFiltersSchema.parse({
    tab: first(searchParams.tab),
    category: first(searchParams.category),
    building: first(searchParams.building),
    priority: first(searchParams.priority),
    cursor: first(searchParams.cursor),
  });
  const [catalog, inbox] = await Promise.all([
    listActiveCatalog(db),
    listInboxReports(db, filters, staff.id),
  ]);
  return {
    filters,
    catalog,
    ...inbox,
    canExport: hasStaffPermission(staff.role, { report: ["export"] }),
  };
}

export async function exportReportsCsv() {
  await requireStaff({ report: ["export"] });
  const rows = await listReportsForExport(db);
  return toCsv(
    dashboard.reports.csvHeaders,
    rows.map((row) => [
      row.number,
      reportStatusLabels[row.status],
      reportPriorityLabels[row.priority],
      row.category,
      row.building,
      row.locationReference,
      row.description,
      row.confirmationsCount,
      row.assignee,
      row.resolutionNote,
      row.createdAt,
      row.resolvedAt,
    ]),
  );
}

export async function getTriageReport(id: string) {
  const staff = await requireStaff({ report: ["read"] });
  const parsed = reportIdSchema.safeParse(id);
  if (!parsed.success) return null;
  const [record, assignable] = await Promise.all([
    findTriageReport(db, parsed.data),
    listAssignableStaff(db),
  ]);
  if (!record) return null;
  return {
    report: record,
    assignable,
    transitions: nextReportStatuses(record.status, staff.role),
    can: {
      triage: hasStaffPermission(staff.role, { report: ["triage"] }),
      assign: hasStaffPermission(staff.role, { report: ["assign"] }),
      resolve: hasStaffPermission(staff.role, { report: ["resolve"] }),
      delete: hasStaffPermission(staff.role, { report: ["delete"] }),
    },
  };
}

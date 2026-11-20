import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { common } from "@/messages/es-MX/common";
import { emails } from "@/messages/es-MX/emails";
import { reportStatusLabels } from "@/messages/es-MX/enums";
import { db } from "@/server/db";
import { reportCategory } from "@/server/db/schema/catalog";
import { report } from "@/server/db/schema/reports";
import { sendEmail } from "@/server/email/send";
import { ReportConfirmEmail, ReportStatusEmail } from "@/server/email/templates/report-emails";
import { requireHashSecret } from "@/server/security/device";

import { issueActionToken } from "./action-tokens";
import { pushToDevice, pushToStaff } from "./push";

import type { StatusChange } from "@/features/reports/triage";

function logFailure(scope: string, error: unknown) {
  console.error(`[notifications] ${scope} failed`, error instanceof Error ? error.message : error);
}

/** Sends the double opt-in email for report updates, including the private tracking link. */
export async function sendReportConfirmation(input: {
  reportId: string;
  number: number;
  email: string;
  trackingUrl: string;
  origin: string;
}) {
  try {
    const token = await issueActionToken(
      db,
      { purpose: "verify_report_email", subjectId: input.reportId },
      requireHashSecret(),
    );
    await sendEmail({
      to: input.email,
      subject: emails.reportConfirm.subject(input.number),
      element: ReportConfirmEmail({
        number: input.number,
        confirmUrl: new URL(`/verify/${token}`, input.origin).href,
        trackingUrl: input.trackingUrl,
      }),
      idempotencyKey: `report-confirm-${input.reportId}`,
    });
  } catch (error) {
    logFailure("report confirmation", error);
  }
}

/**
 * Tells the reporter about a status change: a push to the browsers that opted in on their
 * device, and an email only after they confirmed their address.
 */
export async function notifyReportStatusChange(change: StatusChange & { targetNumber?: number }) {
  try {
    const [row] = await db
      .select({
        id: report.id,
        email: report.reporterEmail,
        emailVerifiedAt: report.reporterEmailVerifiedAt,
        deviceHash: report.deviceHash,
      })
      .from(report)
      .where(and(eq(report.id, change.reportId), isNull(report.deletedAt)))
      .limit(1);
    if (!row) return;

    const statusLabel = reportStatusLabels[change.to];
    await pushToDevice(row.deviceHash, {
      ...common.push.reportUpdate(change.number, statusLabel),
      url: `/reports/${row.id}`,
      tag: `report-${row.id}`,
    });
    if (!row.email || !row.emailVerifiedAt) return;
    await sendEmail({
      to: row.email,
      subject: emails.reportStatus.subject(change.number, statusLabel),
      element: ReportStatusEmail({
        number: change.number,
        statusLabel,
        note: change.note,
        duplicateOfNumber: change.targetNumber ?? null,
      }),
    });
  } catch (error) {
    logFailure("report status", error);
  }
}

/** Alerts maintenance staff who enabled browser notifications about a new report. */
export async function notifyNewReport(reportId: string) {
  try {
    const [row] = await db
      .select({ number: report.number, category: reportCategory.name })
      .from(report)
      .innerJoin(reportCategory, eq(reportCategory.id, report.categoryId))
      .where(eq(report.id, reportId))
      .limit(1);
    if (!row) return;
    await pushToStaff("new_reports", {
      ...common.push.newReport(row.number, row.category),
      url: `/dashboard/reports/${reportId}`,
      tag: `new-report-${reportId}`,
    });
  } catch (error) {
    logFailure("new report", error);
  }
}

import "server-only";

import { and, eq, isNotNull, isNull } from "drizzle-orm";

import { emails } from "@/messages/es-MX/emails";
import { reportStatusLabels } from "@/messages/es-MX/enums";
import { db } from "@/server/db";
import { report } from "@/server/db/schema/reports";
import { sendEmail } from "@/server/email/send";
import { ReportConfirmEmail, ReportStatusEmail } from "@/server/email/templates/report-emails";
import { requireHashSecret } from "@/server/security/device";

import { issueActionToken } from "./action-tokens";

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

/** Emails the reporter about a status change, only after they confirmed their address. */
export async function notifyReportStatusChange(change: StatusChange & { targetNumber?: number }) {
  try {
    const [row] = await db
      .select({ email: report.reporterEmail })
      .from(report)
      .where(
        and(
          eq(report.id, change.reportId),
          isNotNull(report.reporterEmailVerifiedAt),
          isNull(report.deletedAt),
        ),
      )
      .limit(1);
    if (!row?.email) return;

    const statusLabel = reportStatusLabels[change.to];
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

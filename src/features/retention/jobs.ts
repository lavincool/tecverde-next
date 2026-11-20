import "server-only";

import { cleanupMedia } from "@/features/media/cleanup";
import { emails } from "@/messages/es-MX/emails";
import { db } from "@/server/db";
import { sendEmail } from "@/server/email/send";
import { StaffDigestEmail } from "@/server/email/templates/report-emails";

import { applyRetention, loadDigest } from "./repository";

export async function runPurge(now = new Date()) {
  // Storage first, so no object outlives the row that references it.
  const media = await cleanupMedia(now);
  const retention = await applyRetention(db, now);
  return { media, retention };
}

export async function sendStaffDigest(origin: string, now = new Date()) {
  const digest = await loadDigest(db, now);
  if (digest.newReports === 0 || digest.recipients.length === 0) {
    return { sent: 0, newReports: digest.newReports };
  }
  const day = now.toISOString().slice(0, 10);
  const results = await Promise.allSettled(
    digest.recipients.map((to) =>
      sendEmail({
        to,
        subject: emails.staffDigest.subject(digest.newReports),
        element: StaffDigestEmail({
          newReports: digest.newReports,
          backlog: digest.backlog,
          inboxUrl: new URL("/dashboard/reports", origin).href,
        }),
        idempotencyKey: `staff-digest-${day}-${to}`,
      }),
    ),
  );
  return {
    sent: results.filter((result) => result.status === "fulfilled").length,
    newReports: digest.newReports,
  };
}

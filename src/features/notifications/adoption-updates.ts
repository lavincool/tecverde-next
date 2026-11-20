import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { findRequestNotificationTargets } from "@/features/adoption/repository";
import { common } from "@/messages/es-MX/common";
import { emails } from "@/messages/es-MX/emails";
import { db } from "@/server/db";
import { pet } from "@/server/db/schema/adoption";
import { user } from "@/server/db/schema/auth";
import { sendEmail } from "@/server/email/send";
import { ActionEmail } from "@/server/email/templates/report-emails";
import { requireHashSecret } from "@/server/security/device";

import { issueActionToken } from "./action-tokens";
import { pushToStaff } from "./push";

import type { PetStatusChange } from "@/features/adoption/repository";

function logFailure(scope: string, error: unknown) {
  console.error(`[notifications] ${scope} failed`, error instanceof Error ? error.message : error);
}

export async function sendPetPostConfirmation(input: {
  petId: string;
  name: string;
  email: string;
  manageUrl: string;
  origin: string;
}) {
  try {
    const token = await issueActionToken(
      db,
      { purpose: "verify_pet_post", subjectId: input.petId },
      requireHashSecret(),
    );
    const copy = emails.petConfirm;
    await sendEmail({
      to: input.email,
      subject: copy.subject(input.name),
      element: ActionEmail({
        preview: copy.preview,
        heading: copy.heading,
        paragraphs: [copy.body(input.name)],
        action: { href: new URL(`/verify/${token}`, input.origin).href, label: copy.confirm },
        secondary: { intro: copy.manageIntro, href: input.manageUrl, label: copy.manage },
        footnotes: [copy.expires, emails.ignore],
      }),
      idempotencyKey: `pet-confirm-${input.petId}`,
    });
  } catch (error) {
    logFailure("pet confirmation", error);
  }
}

export async function sendRequestConfirmation(input: {
  requestId: string;
  petName: string;
  email: string;
  origin: string;
}) {
  try {
    const token = await issueActionToken(
      db,
      { purpose: "verify_adoption_request", subjectId: input.requestId },
      requireHashSecret(),
    );
    const copy = emails.requestConfirm;
    await sendEmail({
      to: input.email,
      subject: copy.subject(input.petName),
      element: ActionEmail({
        preview: copy.preview,
        heading: copy.heading,
        paragraphs: [copy.body(input.petName)],
        action: { href: new URL(`/verify/${token}`, input.origin).href, label: copy.confirm },
        footnotes: [copy.expires, emails.ignore],
      }),
      idempotencyKey: `request-confirm-${input.requestId}`,
    });
  } catch (error) {
    logFailure("request confirmation", error);
  }
}

async function moderatorEmails() {
  const rows = await db
    .select({ email: user.email })
    .from(user)
    .where(and(inArray(user.role, ["admin", "moderator"]), sql`coalesce(${user.banned}, 0) = 0`));
  return rows.map((row) => row.email);
}

/** Tells moderators that a verified post is waiting in the queue. */
export async function notifyPendingPost(petId: string, origin: string) {
  try {
    const [row] = await db.select({ name: pet.name }).from(pet).where(eq(pet.id, petId)).limit(1);
    if (!row) return;
    const copy = emails.moderationQueue;
    await pushToStaff("pending_posts", {
      ...common.push.pendingPost(row.name),
      url: `/dashboard/adoption/${petId}`,
      tag: `pending-post-${petId}`,
    });
    const recipients = await moderatorEmails();
    await Promise.all(
      recipients.map((to) =>
        sendEmail({
          to,
          subject: copy.subject,
          element: ActionEmail({
            preview: copy.preview,
            heading: copy.heading,
            paragraphs: [copy.body(row.name)],
            action: { href: new URL("/dashboard/adoption", origin).href, label: copy.open },
          }),
        }),
      ),
    );
  } catch (error) {
    logFailure("pending post", error);
  }
}

/** Notifies the poster and moderators once a requester confirmed their email. */
export async function notifyRequestVerified(requestId: string, origin: string) {
  try {
    const targets = await findRequestNotificationTargets(db, requestId);
    if (!targets.petName) return;
    const petName = targets.petName;
    const copy = emails.requestReceived;
    const sends = targets.moderatorEmails.map((to) =>
      sendEmail({
        to,
        subject: copy.subject(petName),
        element: ActionEmail({
          preview: copy.preview,
          heading: copy.heading,
          paragraphs: [copy.staffBody(petName)],
          action: {
            href: new URL("/dashboard/adoption/requests", origin).href,
            label: copy.open,
          },
        }),
      }),
    );
    if (targets.posterEmail) {
      sends.push(
        sendEmail({
          to: targets.posterEmail,
          subject: copy.subject(petName),
          element: ActionEmail({
            preview: copy.preview,
            heading: copy.heading,
            paragraphs: [copy.posterBody(petName)],
          }),
          idempotencyKey: `request-received-${requestId}`,
        }),
      );
    }
    await Promise.all(sends);
  } catch (error) {
    logFailure("request verified", error);
  }
}

export async function notifyModerationResult(
  change: PetStatusChange,
  outcome: "approved" | "rejected",
  origin: string,
) {
  if (!change.posterEmail) return;
  try {
    const copy = emails.petModeration;
    const approved = outcome === "approved";
    await sendEmail({
      to: change.posterEmail,
      subject: approved ? copy.approvedSubject(change.name) : copy.rejectedSubject(change.name),
      element: ActionEmail({
        preview: approved ? copy.approvedHeading : copy.rejectedHeading,
        heading: approved ? copy.approvedHeading : copy.rejectedHeading,
        paragraphs: [approved ? copy.approvedBody(change.name) : copy.rejectedBody(change.name)],
        ...(approved
          ? { action: { href: new URL(`/adopt/${change.slug}`, origin).href, label: copy.view } }
          : {
              note: { label: copy.reason, body: change.note ?? "" },
              footnotes: [copy.retry],
            }),
      }),
      idempotencyKey: `pet-moderation-${change.petId}-${outcome}`,
    });
  } catch (error) {
    logFailure("moderation result", error);
  }
}

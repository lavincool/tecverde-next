import { and, count, gte, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import { adoptionRequest, pet } from "@/server/db/schema/adoption";
import { user } from "@/server/db/schema/auth";
import { report } from "@/server/db/schema/reports";
import { actionToken } from "@/server/db/schema/tokens";

import type { connectDatabase } from "@/server/db/connection";

type Database = ReturnType<typeof connectDatabase>;

const DAY_MS = 24 * 60 * 60 * 1000;
export const SOFT_DELETE_RETENTION_DAYS = 30;
export const CONTACT_RETENTION_DAYS = 180;

/**
 * Applies the retention policy from the privacy notice:
 * - hard-deletes reports and pets soft-deleted more than 30 days ago (children cascade);
 * - clears contact data 180 days after a report, request or post is closed;
 * - removes expired or used action tokens.
 * Media objects must be removed from storage before this runs (see cleanupMedia).
 */
export async function applyRetention(database: Database, now = new Date()) {
  const deleteCutoff = new Date(now.getTime() - SOFT_DELETE_RETENTION_DAYS * DAY_MS);
  const contactCutoff = new Date(now.getTime() - CONTACT_RETENTION_DAYS * DAY_MS);

  const deletedReports = await database
    .delete(report)
    .where(and(isNotNull(report.deletedAt), lt(report.deletedAt, deleteCutoff)))
    .returning({ id: report.id });
  const deletedPets = await database
    .delete(pet)
    .where(and(isNotNull(pet.deletedAt), lt(pet.deletedAt, deleteCutoff)))
    .returning({ id: pet.id });

  const reportContacts = await database
    .update(report)
    .set({ reporterName: null, reporterEmail: null, reporterEmailVerifiedAt: null })
    .where(
      and(
        inArray(report.status, ["resolved", "dismissed", "duplicate"]),
        lt(report.updatedAt, contactCutoff),
        or(isNotNull(report.reporterName), isNotNull(report.reporterEmail)),
      ),
    )
    .returning({ id: report.id });

  const requestContacts = await database
    .update(adoptionRequest)
    .set({ fullName: null, email: null, phone: null })
    .where(
      and(
        or(
          and(isNotNull(adoptionRequest.closedAt), lt(adoptionRequest.closedAt, contactCutoff)),
          and(
            isNull(adoptionRequest.emailVerifiedAt),
            lt(adoptionRequest.createdAt, contactCutoff),
          ),
          sql`${adoptionRequest.petId} in (
            select ${pet.id} from ${pet}
            where ${pet.status} in ('adopted', 'archived') and ${pet.updatedAt} < ${contactCutoff.getTime()}
          )`,
        ),
        or(
          isNotNull(adoptionRequest.fullName),
          isNotNull(adoptionRequest.email),
          isNotNull(adoptionRequest.phone),
        ),
      ),
    )
    .returning({ id: adoptionRequest.id });

  const posterContacts = await database
    .update(pet)
    .set({ posterName: null, posterEmail: null, posterPhone: null })
    .where(
      and(
        inArray(pet.status, ["adopted", "archived"]),
        lt(pet.updatedAt, contactCutoff),
        or(isNotNull(pet.posterName), isNotNull(pet.posterEmail), isNotNull(pet.posterPhone)),
      ),
    )
    .returning({ id: pet.id });

  const tokens = await database
    .delete(actionToken)
    .where(or(lt(actionToken.expiresAt, now), isNotNull(actionToken.usedAt)))
    .returning({ id: actionToken.id });

  return {
    deletedReports: deletedReports.length,
    deletedPets: deletedPets.length,
    clearedReportContacts: reportContacts.length,
    clearedRequestContacts: requestContacts.length,
    clearedPosterContacts: posterContacts.length,
    deletedTokens: tokens.length,
  };
}

export async function loadDigest(database: Database, now = new Date()) {
  const since = new Date(now.getTime() - DAY_MS);
  const [created] = await database
    .select({ total: count() })
    .from(report)
    .where(and(isNull(report.deletedAt), gte(report.createdAt, since)));
  const [backlog] = await database
    .select({ total: count() })
    .from(report)
    .where(
      and(isNull(report.deletedAt), inArray(report.status, ["open", "in_review", "in_progress"])),
    );
  const recipients = await database
    .select({ email: user.email })
    .from(user)
    .where(and(inArray(user.role, ["admin", "maintenance"]), sql`coalesce(${user.banned}, 0) = 0`));
  return {
    newReports: created?.total ?? 0,
    backlog: backlog?.total ?? 0,
    recipients: recipients.map((row) => row.email),
  };
}

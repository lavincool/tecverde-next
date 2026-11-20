import { and, asc, count, desc, eq, inArray, isNull, lt, ne, notInArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { z } from "zod";

import { user } from "@/server/db/schema/auth";
import { building, reportCategory } from "@/server/db/schema/catalog";
import {
  report,
  reportComment,
  reportConfirmation,
  reportStatusEvent,
} from "@/server/db/schema/reports";
import { auditLog } from "@/server/db/schema/staff";

import { reportPriorities, reportStatuses } from "./enums";
import { TRIAGE_COMMENT_MAX_LENGTH, TRIAGE_NOTE_MAX_LENGTH } from "./schema";
import { canTransitionReport, closedReportStatuses, guardedTargets } from "./status-machine";

import type { ReportPriority, ReportStatus } from "./enums";
import type { StaffRole } from "@/features/staff/enums";
import type { connectDatabase } from "@/server/db/connection";
import type { SQL } from "drizzle-orm";

type Database = ReturnType<typeof connectDatabase>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type TriageActor = { id: string; role: StaffRole };

export const INBOX_PAGE_SIZE = 25;

export const inboxTabs = ["new", "mine", "in_progress", "closed"] as const;
export type InboxTab = (typeof inboxTabs)[number];

const optionalId = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(z.uuidv7().optional())
  .catch(undefined);

export const inboxFiltersSchema = z.object({
  tab: z.enum(inboxTabs).catch("new"),
  category: optionalId,
  building: optionalId,
  priority: z.enum(reportPriorities).optional().catch(undefined),
  cursor: optionalId,
});

export type InboxFilters = z.output<typeof inboxFiltersSchema>;

export const noteSchema = z
  .string()
  .default("")
  .pipe(
    z
      .string()
      .trim()
      .max(TRIAGE_NOTE_MAX_LENGTH)
      .transform((value) => (value.length > 0 ? value : null)),
  );

export const statusChangeSchema = z.object({
  reportId: z.uuidv7(),
  status: z.enum(reportStatuses),
  note: noteSchema,
});

export const priorityChangeSchema = z.object({
  reportId: z.uuidv7(),
  priority: z.enum(reportPriorities),
});

export const assignSchema = z.object({
  reportId: z.uuidv7(),
  assigneeId: z
    .string()
    .default("")
    .transform((value) => (value.length > 0 ? value : null)),
});

export const duplicateSchema = z.object({
  reportId: z.uuidv7(),
  targetNumber: z.coerce.number().int().positive(),
});

export const commentSchema = z.object({
  reportId: z.uuidv7(),
  body: z.string().trim().min(1).max(TRIAGE_COMMENT_MAX_LENGTH),
});

export const resolveSchema = z.object({
  reportId: z.uuidv7(),
  note: z.string().trim().min(1).max(TRIAGE_NOTE_MAX_LENGTH),
});

export class ReportTriageError extends Error {
  constructor(
    readonly reason:
      | "not_found"
      | "invalid_transition"
      | "invalid_assignee"
      | "invalid_duplicate"
      | "stale",
  ) {
    super(reason);
  }
}

export type InboxReport = {
  id: string;
  number: number;
  status: ReportStatus;
  priority: ReportPriority;
  locationReference: string;
  confirmationsCount: number;
  createdAt: Date;
  categoryName: string;
  categoryIconKey: string;
  buildingShortName: string;
  assigneeName: string | null;
};

const closedStatusList: ReportStatus[] = [...closedReportStatuses];

function tabFilter(tab: InboxTab, actorId: string): SQL | undefined {
  if (tab === "mine") {
    return and(eq(report.assigneeUserId, actorId), notInArray(report.status, closedStatusList));
  }
  if (tab === "in_progress") return eq(report.status, "in_progress");
  if (tab === "closed") return inArray(report.status, closedStatusList);
  return inArray(report.status, ["open", "in_review"]);
}

export async function listInboxReports(
  database: Database,
  filters: InboxFilters,
  actorId: string,
): Promise<{ reports: InboxReport[]; nextCursor: string | undefined }> {
  const conditions: (SQL | undefined)[] = [
    isNull(report.deletedAt),
    tabFilter(filters.tab, actorId),
  ];
  if (filters.category) conditions.push(eq(report.categoryId, filters.category));
  if (filters.building) conditions.push(eq(report.buildingId, filters.building));
  if (filters.priority) conditions.push(eq(report.priority, filters.priority));
  if (filters.cursor) conditions.push(lt(report.id, filters.cursor));

  const rows = await database
    .select({
      id: report.id,
      number: report.number,
      status: report.status,
      priority: report.priority,
      locationReference: report.locationReference,
      confirmationsCount: report.confirmationsCount,
      createdAt: report.createdAt,
      categoryName: reportCategory.name,
      categoryIconKey: reportCategory.iconKey,
      buildingShortName: building.shortName,
      assigneeName: user.name,
    })
    .from(report)
    .innerJoin(reportCategory, eq(reportCategory.id, report.categoryId))
    .innerJoin(building, eq(building.id, report.buildingId))
    .leftJoin(user, eq(user.id, report.assigneeUserId))
    .where(and(...conditions))
    .orderBy(desc(report.id))
    .limit(INBOX_PAGE_SIZE + 1);

  const hasMore = rows.length > INBOX_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, INBOX_PAGE_SIZE) : rows;
  return { reports: page, nextCursor: hasMore ? page.at(-1)?.id : undefined };
}

export type TriageReport = NonNullable<Awaited<ReturnType<typeof findTriageReport>>>;

export async function findTriageReport(database: Database, id: string) {
  const assignee = alias(user, "assignee");
  const duplicateTarget = alias(report, "duplicate_target");
  const [row] = await database
    .select({
      id: report.id,
      number: report.number,
      status: report.status,
      priority: report.priority,
      locationReference: report.locationReference,
      description: report.description,
      confirmationsCount: report.confirmationsCount,
      reporterName: report.reporterName,
      reporterEmail: report.reporterEmail,
      reporterEmailVerifiedAt: report.reporterEmailVerifiedAt,
      resolutionNote: report.resolutionNote,
      resolvedAt: report.resolvedAt,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      categoryName: reportCategory.name,
      categoryIconKey: reportCategory.iconKey,
      buildingName: building.name,
      assigneeId: report.assigneeUserId,
      assigneeName: assignee.name,
      duplicateOfId: report.duplicateOfReportId,
      duplicateOfNumber: duplicateTarget.number,
    })
    .from(report)
    .innerJoin(reportCategory, eq(reportCategory.id, report.categoryId))
    .innerJoin(building, eq(building.id, report.buildingId))
    .leftJoin(assignee, eq(assignee.id, report.assigneeUserId))
    .leftJoin(duplicateTarget, eq(duplicateTarget.id, report.duplicateOfReportId))
    .where(and(eq(report.id, id), isNull(report.deletedAt)))
    .limit(1);
  if (!row) return null;

  const [events, comments] = await Promise.all([
    database
      .select({
        id: reportStatusEvent.id,
        fromStatus: reportStatusEvent.fromStatus,
        toStatus: reportStatusEvent.toStatus,
        note: reportStatusEvent.note,
        actorName: user.name,
        actorUserId: reportStatusEvent.actorUserId,
        createdAt: reportStatusEvent.createdAt,
      })
      .from(reportStatusEvent)
      .leftJoin(user, eq(user.id, reportStatusEvent.actorUserId))
      .where(eq(reportStatusEvent.reportId, id))
      .orderBy(asc(reportStatusEvent.createdAt), asc(reportStatusEvent.id)),
    database
      .select({
        id: reportComment.id,
        body: reportComment.body,
        authorName: user.name,
        createdAt: reportComment.createdAt,
      })
      .from(reportComment)
      .leftJoin(user, eq(user.id, reportComment.authorUserId))
      .where(eq(reportComment.reportId, id))
      .orderBy(asc(reportComment.createdAt), asc(reportComment.id)),
  ]);

  return { ...row, events, comments };
}

export async function listAssignableStaff(database: Database) {
  return database
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(and(inArray(user.role, ["admin", "maintenance"]), sql`coalesce(${user.banned}, 0) = 0`))
    .orderBy(asc(user.name));
}

async function lockReport(tx: Transaction, id: string) {
  const [current] = await tx
    .select({
      id: report.id,
      number: report.number,
      status: report.status,
      priority: report.priority,
      assigneeUserId: report.assigneeUserId,
      deviceHash: report.deviceHash,
    })
    .from(report)
    .where(and(eq(report.id, id), isNull(report.deletedAt)))
    .limit(1);
  if (!current) throw new ReportTriageError("not_found");
  return current;
}

async function audit(
  tx: Transaction,
  actor: TriageActor,
  action: string,
  reportId: string,
  metadata?: Record<string, unknown>,
) {
  await tx.insert(auditLog).values({
    actorUserId: actor.id,
    action,
    entityType: "report",
    entityId: reportId,
    metadata: metadata ?? null,
  });
}

async function applyTransition(
  tx: Transaction,
  input: {
    reportId: string;
    from: ReportStatus;
    to: ReportStatus;
    note: string | null;
    actor: TriageActor;
    patch?: Partial<typeof report.$inferInsert>;
  },
) {
  const now = new Date();
  const [updated] = await tx
    .update(report)
    .set({
      status: input.to,
      updatedAt: now,
      resolvedAt: input.to === "resolved" ? now : null,
      ...input.patch,
    })
    .where(and(eq(report.id, input.reportId), eq(report.status, input.from)))
    .returning({ id: report.id });
  if (!updated) throw new ReportTriageError("stale");

  await tx.insert(reportStatusEvent).values({
    reportId: input.reportId,
    fromStatus: input.from,
    toStatus: input.to,
    actorUserId: input.actor.id,
    note: input.note,
  });
}

export type StatusChange = {
  reportId: string;
  number: number;
  from: ReportStatus;
  to: ReportStatus;
  note: string | null;
};

export async function changeReportStatus(
  database: Database,
  input: { reportId: string; status: ReportStatus; note: string | null },
  actor: TriageActor,
): Promise<StatusChange> {
  return database.transaction(
    async (tx) => {
      const current = await lockReport(tx, input.reportId);
      const guarded = guardedTargets.some((target) => target === input.status);
      if (guarded || !canTransitionReport(current.status, input.status, actor.role)) {
        throw new ReportTriageError("invalid_transition");
      }
      await applyTransition(tx, {
        reportId: current.id,
        from: current.status,
        to: input.status,
        note: input.note,
        actor,
        patch: input.status === "open" ? { duplicateOfReportId: null } : {},
      });
      await audit(tx, actor, "report.change_status", current.id, {
        from: current.status,
        to: input.status,
      });
      return {
        reportId: current.id,
        number: current.number,
        from: current.status,
        to: input.status,
        note: input.note,
      };
    },
    { behavior: "immediate" },
  );
}

export async function resolveReport(
  database: Database,
  input: { reportId: string; note: string },
  actor: TriageActor,
): Promise<StatusChange> {
  return database.transaction(
    async (tx) => {
      const current = await lockReport(tx, input.reportId);
      if (!canTransitionReport(current.status, "resolved", actor.role)) {
        throw new ReportTriageError("invalid_transition");
      }
      await applyTransition(tx, {
        reportId: current.id,
        from: current.status,
        to: "resolved",
        note: input.note,
        actor,
        patch: { resolutionNote: input.note },
      });
      await audit(tx, actor, "report.resolve", current.id);
      return {
        reportId: current.id,
        number: current.number,
        from: current.status,
        to: "resolved",
        note: input.note,
      };
    },
    { behavior: "immediate" },
  );
}

export async function setReportPriority(
  database: Database,
  input: { reportId: string; priority: ReportPriority },
  actor: TriageActor,
) {
  await database.transaction(
    async (tx) => {
      const current = await lockReport(tx, input.reportId);
      if (current.priority === input.priority) return;
      await tx
        .update(report)
        .set({ priority: input.priority, updatedAt: new Date() })
        .where(eq(report.id, current.id));
      await audit(tx, actor, "report.set_priority", current.id, {
        from: current.priority,
        to: input.priority,
      });
    },
    { behavior: "immediate" },
  );
}

export async function assignReport(
  database: Database,
  input: { reportId: string; assigneeId: string | null },
  actor: TriageActor,
) {
  await database.transaction(
    async (tx) => {
      const current = await lockReport(tx, input.reportId);
      if (input.assigneeId) {
        const [assignee] = await tx
          .select({ id: user.id })
          .from(user)
          .where(
            and(
              eq(user.id, input.assigneeId),
              inArray(user.role, ["admin", "maintenance"]),
              sql`coalesce(${user.banned}, 0) = 0`,
            ),
          )
          .limit(1);
        if (!assignee) throw new ReportTriageError("invalid_assignee");
      }
      if (current.assigneeUserId === input.assigneeId) return;
      await tx
        .update(report)
        .set({ assigneeUserId: input.assigneeId, updatedAt: new Date() })
        .where(eq(report.id, current.id));
      await audit(tx, actor, "report.assign", current.id, { assigneeId: input.assigneeId });
    },
    { behavior: "immediate" },
  );
}

export async function markReportDuplicate(
  database: Database,
  input: { reportId: string; targetNumber: number },
  actor: TriageActor,
): Promise<StatusChange & { targetId: string; targetNumber: number }> {
  return database.transaction(
    async (tx) => {
      const current = await lockReport(tx, input.reportId);
      if (!canTransitionReport(current.status, "duplicate", actor.role)) {
        throw new ReportTriageError("invalid_transition");
      }
      const [target] = await tx
        .select({ id: report.id, number: report.number, status: report.status })
        .from(report)
        .where(
          and(
            eq(report.number, input.targetNumber),
            ne(report.id, current.id),
            isNull(report.deletedAt),
          ),
        )
        .limit(1);
      if (!target || target.status === "duplicate") {
        throw new ReportTriageError("invalid_duplicate");
      }

      await applyTransition(tx, {
        reportId: current.id,
        from: current.status,
        to: "duplicate",
        note: null,
        actor,
        patch: { duplicateOfReportId: target.id },
      });

      // Merge the original reporter and every "me too" into the target report.
      await tx
        .insert(reportConfirmation)
        .values({ reportId: target.id, deviceHash: current.deviceHash })
        .onConflictDoNothing();
      await tx.run(sql`
        insert or ignore into ${reportConfirmation} (report_id, device_hash, created_at)
        select ${target.id}, device_hash, created_at
        from ${reportConfirmation}
        where report_id = ${current.id}
      `);
      const [merged] = await tx
        .select({ total: count() })
        .from(reportConfirmation)
        .where(eq(reportConfirmation.reportId, target.id));
      await tx
        .update(report)
        .set({ confirmationsCount: merged?.total ?? 0, updatedAt: new Date() })
        .where(eq(report.id, target.id));

      await audit(tx, actor, "report.mark_duplicate", current.id, { targetId: target.id });
      return {
        reportId: current.id,
        number: current.number,
        from: current.status,
        to: "duplicate",
        note: null,
        targetId: target.id,
        targetNumber: target.number,
      };
    },
    { behavior: "immediate" },
  );
}

export async function addReportComment(
  database: Database,
  input: { reportId: string; body: string },
  actor: TriageActor,
) {
  await database.transaction(
    async (tx) => {
      const current = await lockReport(tx, input.reportId);
      await tx
        .insert(reportComment)
        .values({ reportId: current.id, authorUserId: actor.id, body: input.body });
      await audit(tx, actor, "report.comment", current.id);
    },
    { behavior: "immediate" },
  );
}

export async function softDeleteReport(
  database: Database,
  input: { reportId: string },
  actor: TriageActor,
) {
  await database.transaction(
    async (tx) => {
      const current = await lockReport(tx, input.reportId);
      await tx
        .update(report)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(report.id, current.id));
      await audit(tx, actor, "report.soft_delete", current.id);
    },
    { behavior: "immediate" },
  );
}

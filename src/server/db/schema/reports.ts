import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { reportPriorities, reportStatuses } from "@/features/reports/enums";

import { user } from "./auth";
import { building, reportCategory } from "./catalog";
import { createdAt, id, oneOf, timestamp, updatedAt } from "./columns";

import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const report = sqliteTable(
  "report",
  {
    id: id(),
    number: integer("number").notNull().unique(),
    categoryId: text("category_id")
      .notNull()
      .references(() => reportCategory.id, { onDelete: "restrict" }),
    buildingId: text("building_id")
      .notNull()
      .references(() => building.id, { onDelete: "restrict" }),
    locationReference: text("location_reference").notNull(),
    description: text("description").notNull(),
    status: text("status", { enum: reportStatuses }).notNull().default("open"),
    priority: text("priority", { enum: reportPriorities }).notNull(),
    assigneeUserId: text("assignee_user_id").references(() => user.id, { onDelete: "set null" }),
    duplicateOfReportId: text("duplicate_of_report_id").references(
      (): AnySQLiteColumn => report.id,
      { onDelete: "set null" },
    ),
    confirmationsCount: integer("confirmations_count").notNull().default(0),
    reporterName: text("reporter_name"),
    reporterEmail: text("reporter_email"),
    reporterEmailVerifiedAt: timestamp("reporter_email_verified_at"),
    deviceHash: text("device_hash").notNull(),
    ipHash: text("ip_hash").notNull(),
    trackingTokenHash: text("tracking_token_hash").notNull().unique(),
    resolutionNote: text("resolution_note"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    check("report_status", oneOf(table.status, reportStatuses)),
    check("report_priority", oneOf(table.priority, reportPriorities)),
    check("report_number_positive", sql`${table.number} > 0`),
    check("report_confirmations_nonnegative", sql`${table.confirmationsCount} >= 0`),
    check("report_reference_length", sql`length(${table.locationReference}) between 1 and 120`),
    check("report_description_length", sql`length(${table.description}) between 1 and 500`),
    check("report_distinct_duplicate_target", sql`${table.id} <> ${table.duplicateOfReportId}`),
    index("report_status_created").on(table.status, table.createdAt),
    index("report_category_building_status").on(table.categoryId, table.buildingId, table.status),
    index("report_assignee_status").on(table.assigneeUserId, table.status),
    index("report_device_created").on(table.deviceHash, table.createdAt),
  ],
);

export const reportStatusEvent = sqliteTable(
  "report_status_event",
  {
    id: id(),
    reportId: text("report_id")
      .notNull()
      .references(() => report.id, { onDelete: "cascade" }),
    fromStatus: text("from_status", { enum: reportStatuses }),
    toStatus: text("to_status", { enum: reportStatuses }).notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (table) => [
    check("report_event_from_status", oneOf(table.fromStatus, reportStatuses)),
    check("report_event_to_status", oneOf(table.toStatus, reportStatuses)),
    index("report_event_report_created").on(table.reportId, table.createdAt),
  ],
);

export const reportConfirmation = sqliteTable(
  "report_confirmation",
  {
    reportId: text("report_id")
      .notNull()
      .references(() => report.id, { onDelete: "cascade" }),
    deviceHash: text("device_hash").notNull(),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.reportId, table.deviceHash] })],
);

export const reportComment = sqliteTable(
  "report_comment",
  {
    id: id(),
    reportId: text("report_id")
      .notNull()
      .references(() => report.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id").references(() => user.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("report_comment_report_created").on(table.reportId, table.createdAt)],
);

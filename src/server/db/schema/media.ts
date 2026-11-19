import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { pet } from "./adoption";
import { user } from "./auth";
import { createdAt, id, oneOf, timestamp } from "./columns";
import { report } from "./reports";

export const mediaBuckets = ["public", "private"] as const;
export const mediaKinds = ["report_before", "report_after", "pet_gallery"] as const;
export const mediaStatuses = ["pending", "attached", "deleted"] as const;

export const media = sqliteTable(
  "media",
  {
    id: id(),
    bucket: text("bucket", { enum: mediaBuckets }).notNull(),
    key: text("key").notNull().unique(),
    kind: text("kind", { enum: mediaKinds }).notNull(),
    draftId: text("draft_id").notNull(),
    reportId: text("report_id").references(() => report.id, { onDelete: "cascade" }),
    petId: text("pet_id").references(() => pet.id, { onDelete: "cascade" }),
    status: text("status", { enum: mediaStatuses }).notNull().default("pending"),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    dominantColor: text("dominant_color").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    deviceHash: text("device_hash"),
    uploadedByUserId: text("uploaded_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    attachedAt: timestamp("attached_at"),
  },
  (table) => [
    check("media_bucket", oneOf(table.bucket, mediaBuckets)),
    check("media_kind", oneOf(table.kind, mediaKinds)),
    check("media_status", oneOf(table.status, mediaStatuses)),
    check("media_single_owner", sql`${table.reportId} is null or ${table.petId} is null`),
    index("media_status_created").on(table.status, table.createdAt),
    index("media_report").on(table.reportId),
    index("media_pet_order").on(table.petId, table.sortOrder),
    index("media_draft").on(table.draftId),
  ],
);

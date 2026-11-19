import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { staffRoles } from "@/features/staff/enums";

import { user } from "./auth";
import { createdAt, id, oneOf, timestamp } from "./columns";

export const staffInvite = sqliteTable(
  "staff_invite",
  {
    id: id(),
    email: text("email").notNull(),
    role: text("role", { enum: staffRoles }).notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    invitedByUserId: text("invited_by_user_id").references(() => user.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: createdAt(),
  },
  (table) => [
    check("staff_invite_role", oneOf(table.role, staffRoles)),
    index("staff_invite_email").on(table.email),
  ],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: id(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (table) => [index("audit_log_entity").on(table.entityType, table.entityId)],
);

import { check, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { id, oneOf, timestamp } from "./columns";

export const actionTokenPurposes = [
  "verify_pet_post",
  "verify_adoption_request",
  "verify_report_email",
] as const;

export const actionToken = sqliteTable(
  "action_token",
  {
    id: id(),
    purpose: text("purpose", { enum: actionTokenPurposes }).notNull(),
    subjectId: text("subject_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
  },
  (table) => [check("action_token_purpose", oneOf(table.purpose, actionTokenPurposes))],
);

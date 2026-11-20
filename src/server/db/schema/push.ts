import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { createdAt, id } from "./columns";

export const pushTopics = ["report_updates", "new_reports", "pending_posts"] as const;
export type PushTopic = (typeof pushTopics)[number];

export const pushSubscription = sqliteTable(
  "push_subscription",
  {
    id: id(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    deviceHash: text("device_hash"),
    topics: text("topics", { mode: "json" }).$type<PushTopic[]>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("push_subscription_device").on(table.deviceHash),
    index("push_subscription_user").on(table.userId),
  ],
);

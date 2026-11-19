import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { reportPriorities } from "@/features/reports/enums";

import { id, oneOf } from "./columns";

export const building = sqliteTable("building", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const reportCategory = sqliteTable(
  "report_category",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    iconKey: text("icon_key").notNull(),
    defaultPriority: text("default_priority", { enum: reportPriorities })
      .notNull()
      .default("normal"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [check("report_category_priority", oneOf(table.defaultPriority, reportPriorities))],
);

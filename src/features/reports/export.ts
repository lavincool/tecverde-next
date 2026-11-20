import { asc, eq, isNull } from "drizzle-orm";

import { user } from "@/server/db/schema/auth";
import { building, reportCategory } from "@/server/db/schema/catalog";
import { report } from "@/server/db/schema/reports";

import type { connectDatabase } from "@/server/db/connection";

type Database = ReturnType<typeof connectDatabase>;

export async function listReportsForExport(database: Database) {
  return database
    .select({
      number: report.number,
      status: report.status,
      priority: report.priority,
      category: reportCategory.name,
      building: building.name,
      locationReference: report.locationReference,
      description: report.description,
      confirmationsCount: report.confirmationsCount,
      assignee: user.name,
      resolutionNote: report.resolutionNote,
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt,
    })
    .from(report)
    .innerJoin(reportCategory, eq(reportCategory.id, report.categoryId))
    .innerJoin(building, eq(building.id, report.buildingId))
    .leftJoin(user, eq(user.id, report.assigneeUserId))
    .where(isNull(report.deletedAt))
    .orderBy(asc(report.number));
}

/** Escapes a value for CSV and neutralizes spreadsheet formula injection. */
export function csvCell(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | Date | null | undefined)[])[],
): string {
  const lines = [headers, ...rows].map((row) => row.map((cell) => csvCell(cell)).join(","));
  // Excel needs the BOM to detect UTF-8 accents.
  return `﻿${lines.join("\r\n")}\r\n`;
}

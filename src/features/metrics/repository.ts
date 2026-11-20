import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { building, reportCategory } from "@/server/db/schema/catalog";
import { report } from "@/server/db/schema/reports";

import type { connectDatabase } from "@/server/db/connection";

type Database = ReturnType<typeof connectDatabase>;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReportMetrics = {
  openBacklog: number;
  createdToday: number;
  resolvedLast30Days: number;
  averageResolutionMs: number | null;
  medianResolutionMs: number | null;
  byCategory: { id: string; name: string; total: number; open: number }[];
  byBuilding: { id: string; name: string; total: number; open: number }[];
};

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? 0;
  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[middle - 1] ?? upper;
  return (lower + upper) / 2;
}

export function startOfMatamorosDay(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Matamoros",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const elapsed =
    ((value("hour") * 60 + value("minute")) * 60 + value("second")) * 1000 + now.getMilliseconds();
  return new Date(now.getTime() - elapsed);
}

const openStatuses = ["open", "in_review", "in_progress"] as const;

export async function loadReportMetrics(
  database: Database,
  now = new Date(),
): Promise<ReportMetrics> {
  const live = isNull(report.deletedAt);
  const openCount = sql<
    number | null
  >`sum(case when ${inArray(report.status, openStatuses)} then 1 else 0 end)`;

  const [backlog, today, resolvedRecent, durations, byCategory, byBuilding] = await Promise.all([
    database
      .select({ total: count() })
      .from(report)
      .where(and(live, inArray(report.status, openStatuses))),
    database
      .select({ total: count() })
      .from(report)
      .where(and(live, gte(report.createdAt, startOfMatamorosDay(now)))),
    database
      .select({ total: count() })
      .from(report)
      .where(
        and(
          live,
          eq(report.status, "resolved"),
          gte(report.resolvedAt, new Date(now.getTime() - 30 * DAY_MS)),
        ),
      ),
    database
      .select({ createdAt: report.createdAt, resolvedAt: report.resolvedAt })
      .from(report)
      .where(and(live, eq(report.status, "resolved"), isNotNull(report.resolvedAt))),
    database
      .select({
        id: reportCategory.id,
        name: reportCategory.name,
        total: count(report.id),
        open: openCount,
      })
      .from(reportCategory)
      .leftJoin(report, and(eq(report.categoryId, reportCategory.id), live))
      .groupBy(reportCategory.id)
      .orderBy(desc(count(report.id)), asc(reportCategory.sortOrder)),
    database
      .select({
        id: building.id,
        name: building.name,
        total: count(report.id),
        open: openCount,
      })
      .from(building)
      .leftJoin(report, and(eq(report.buildingId, building.id), live))
      .groupBy(building.id)
      .orderBy(desc(count(report.id)), asc(building.sortOrder)),
  ]);

  const resolutionTimes = durations.flatMap(({ createdAt, resolvedAt }) =>
    resolvedAt ? [Math.max(0, resolvedAt.getTime() - createdAt.getTime())] : [],
  );
  const average =
    resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, value) => sum + value, 0) / resolutionTimes.length
      : null;

  return {
    openBacklog: backlog[0]?.total ?? 0,
    createdToday: today[0]?.total ?? 0,
    resolvedLast30Days: resolvedRecent[0]?.total ?? 0,
    averageResolutionMs: average,
    medianResolutionMs: median(resolutionTimes),
    byCategory: byCategory.map(({ id, name, total, open }) => ({
      id,
      name,
      total,
      open: open ?? 0,
    })),
    byBuilding: byBuilding.map(({ id, name, total, open }) => ({
      id,
      name,
      total,
      open: open ?? 0,
    })),
  };
}

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  building,
  report,
  reportCategory,
  reportConfirmation,
  reportStatusEvent,
} from "@/server/db/schema";

import type { ReportPriority, ReportStatus } from "./enums";
import type { connectDatabase } from "@/server/db/connection";
import type { SQL } from "drizzle-orm";

type Database = ReturnType<typeof connectDatabase>;

export type ReportCatalogCategory = {
  id: string;
  slug: string;
  name: string;
  iconKey: string;
};

export type ReportCatalogBuilding = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
};

export type DeviceReportSummary = {
  id: string;
  number: number;
  status: ReportStatus;
  locationReference: string;
  description: string;
  createdAt: Date;
  categoryName: string;
  categoryIconKey: string;
  buildingShortName: string;
};

export type ReportDetailData = {
  id: string;
  number: number;
  status: ReportStatus;
  priority: ReportPriority;
  locationReference: string;
  description: string;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    slug: string;
    name: string;
    iconKey: string;
  };
  building: {
    id: string;
    slug: string;
    name: string;
    shortName: string;
  };
  events: {
    id: string;
    fromStatus: ReportStatus | null;
    toStatus: ReportStatus;
    note: string | null;
    createdAt: Date;
  }[];
};

export async function listActiveCatalog(database: Database): Promise<{
  categories: ReportCatalogCategory[];
  buildings: ReportCatalogBuilding[];
}> {
  const [categories, buildings] = await Promise.all([
    database
      .select({
        id: reportCategory.id,
        slug: reportCategory.slug,
        name: reportCategory.name,
        iconKey: reportCategory.iconKey,
      })
      .from(reportCategory)
      .where(eq(reportCategory.isActive, true))
      .orderBy(asc(reportCategory.sortOrder), asc(reportCategory.name)),
    database
      .select({
        id: building.id,
        slug: building.slug,
        name: building.name,
        shortName: building.shortName,
      })
      .from(building)
      .where(eq(building.isActive, true))
      .orderBy(asc(building.sortOrder), asc(building.name)),
  ]);

  return { categories, buildings };
}

export async function listReportsByDeviceHash(
  database: Database,
  deviceHash: string,
  limit = 50,
): Promise<DeviceReportSummary[]> {
  return database
    .select({
      id: report.id,
      number: report.number,
      status: report.status,
      locationReference: report.locationReference,
      description: report.description,
      createdAt: report.createdAt,
      categoryName: reportCategory.name,
      categoryIconKey: reportCategory.iconKey,
      buildingShortName: building.shortName,
    })
    .from(report)
    .innerJoin(reportCategory, eq(reportCategory.id, report.categoryId))
    .innerJoin(building, eq(building.id, report.buildingId))
    .where(and(eq(report.deviceHash, deviceHash), isNull(report.deletedAt)))
    .orderBy(desc(report.createdAt), desc(report.number))
    .limit(limit);
}

async function findReportDetailWhere(
  database: Database,
  whereClause: SQL | undefined,
): Promise<ReportDetailData | null> {
  const [row] = await database
    .select({
      id: report.id,
      number: report.number,
      status: report.status,
      priority: report.priority,
      locationReference: report.locationReference,
      description: report.description,
      resolutionNote: report.resolutionNote,
      resolvedAt: report.resolvedAt,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      category: {
        id: reportCategory.id,
        slug: reportCategory.slug,
        name: reportCategory.name,
        iconKey: reportCategory.iconKey,
      },
      building: {
        id: building.id,
        slug: building.slug,
        name: building.name,
        shortName: building.shortName,
      },
    })
    .from(report)
    .innerJoin(reportCategory, eq(reportCategory.id, report.categoryId))
    .innerJoin(building, eq(building.id, report.buildingId))
    .where(whereClause)
    .limit(1);

  if (!row) return null;

  const events = await database
    .select({
      id: reportStatusEvent.id,
      fromStatus: reportStatusEvent.fromStatus,
      toStatus: reportStatusEvent.toStatus,
      note: reportStatusEvent.note,
      createdAt: reportStatusEvent.createdAt,
    })
    .from(reportStatusEvent)
    .where(eq(reportStatusEvent.reportId, row.id))
    .orderBy(asc(reportStatusEvent.createdAt));

  return { ...row, events };
}

export async function findReportDetailById(
  database: Database,
  id: string,
  viewer: { deviceHash?: string | undefined; allowAny: boolean },
): Promise<ReportDetailData | null> {
  if (!viewer.allowAny && !viewer.deviceHash) return null;

  const filters = [eq(report.id, id), isNull(report.deletedAt)];
  if (!viewer.allowAny && viewer.deviceHash) {
    filters.push(eq(report.deviceHash, viewer.deviceHash));
  }

  return findReportDetailWhere(database, and(...filters));
}

export async function findReportDetailByTrackingTokenHash(
  database: Database,
  tokenHash: string,
): Promise<ReportDetailData | null> {
  return findReportDetailWhere(
    database,
    and(eq(report.trackingTokenHash, tokenHash), isNull(report.deletedAt)),
  );
}

export type SimilarReport = {
  id: string;
  status: ReportStatus;
  locationReference: string;
  confirmationsCount: number;
  createdAt: Date;
  categoryName: string;
  buildingShortName: string;
  isOwn: boolean;
  alreadyConfirmed: boolean;
};

export const SIMILAR_REPORTS_LIMIT = 5;
const similarStatuses: ReportStatus[] = ["open", "in_review", "in_progress"];

/** Lists open reports in the same place without exposing descriptions, photos or reporters. */
export async function listSimilarOpenReports(
  database: Database,
  input: { categoryId: string; buildingId: string; deviceHash: string | undefined },
): Promise<SimilarReport[]> {
  const deviceHash = input.deviceHash ?? "";
  const rows = await database
    .select({
      id: report.id,
      status: report.status,
      locationReference: report.locationReference,
      confirmationsCount: report.confirmationsCount,
      createdAt: report.createdAt,
      categoryName: reportCategory.name,
      buildingShortName: building.shortName,
      isOwn: sql<number>`${report.deviceHash} = ${deviceHash}`,
      alreadyConfirmed: sql<number>`exists (
        select 1 from ${reportConfirmation}
        where ${reportConfirmation.reportId} = ${report.id}
          and ${reportConfirmation.deviceHash} = ${deviceHash}
      )`,
    })
    .from(report)
    .innerJoin(reportCategory, eq(reportCategory.id, report.categoryId))
    .innerJoin(building, eq(building.id, report.buildingId))
    .where(
      and(
        eq(report.categoryId, input.categoryId),
        eq(report.buildingId, input.buildingId),
        inArray(report.status, similarStatuses),
        isNull(report.deletedAt),
      ),
    )
    .orderBy(desc(report.confirmationsCount), desc(report.createdAt))
    .limit(SIMILAR_REPORTS_LIMIT);

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    locationReference: row.locationReference,
    confirmationsCount: row.confirmationsCount,
    createdAt: row.createdAt,
    categoryName: row.categoryName,
    buildingShortName: row.buildingShortName,
    isOwn: Boolean(row.isOwn) && deviceHash.length > 0,
    alreadyConfirmed: Boolean(row.alreadyConfirmed) && deviceHash.length > 0,
  }));
}

export type ConfirmationResult = "confirmed" | "already_confirmed" | "own_report" | "not_found";

/** Records one "me too" per device and keeps the counter in sync atomically. */
export async function confirmReportRecord(
  database: Database,
  input: { reportId: string; deviceHash: string },
): Promise<{ result: ConfirmationResult; confirmationsCount: number }> {
  return database.transaction(
    async (tx) => {
      const [target] = await tx
        .select({ id: report.id, deviceHash: report.deviceHash, count: report.confirmationsCount })
        .from(report)
        .where(
          and(
            eq(report.id, input.reportId),
            inArray(report.status, similarStatuses),
            isNull(report.deletedAt),
          ),
        )
        .limit(1);
      if (!target) return { result: "not_found", confirmationsCount: 0 };
      if (target.deviceHash === input.deviceHash) {
        return { result: "own_report", confirmationsCount: target.count };
      }

      const inserted = await tx
        .insert(reportConfirmation)
        .values({ reportId: target.id, deviceHash: input.deviceHash })
        .onConflictDoNothing()
        .returning({ reportId: reportConfirmation.reportId });
      if (inserted.length === 0) {
        return { result: "already_confirmed", confirmationsCount: target.count };
      }

      const [updated] = await tx
        .update(report)
        .set({ confirmationsCount: sql`${report.confirmationsCount} + 1` })
        .where(eq(report.id, target.id))
        .returning({ count: report.confirmationsCount });
      return { result: "confirmed", confirmationsCount: updated?.count ?? target.count + 1 };
    },
    { behavior: "immediate" },
  );
}

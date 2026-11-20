import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { building, report, reportCategory, reportStatusEvent } from "@/server/db/schema";

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

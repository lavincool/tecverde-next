import "server-only";

import { headers } from "next/headers";
import { connection } from "next/server";

import { signedReportPhotos } from "@/features/media/queries";
import { getStaffSession } from "@/server/auth/guards";
import { hasStaffPermission } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { getDeviceHash, readHashSecret } from "@/server/security/device";

import { hashTrackingToken } from "./mutations";
import {
  findReportDetailById,
  findReportDetailByTrackingTokenHash,
  listActiveCatalog,
  listReportsByDeviceHash,
} from "./repository";
import { reportIdSchema, trackingTokenSchema } from "./schema";

import type {
  DeviceReportSummary,
  ReportCatalogBuilding,
  ReportCatalogCategory,
  ReportDetailData,
} from "./repository";

export type ReportCatalogResult =
  | {
      status: "ready";
      categories: ReportCatalogCategory[];
      buildings: ReportCatalogBuilding[];
    }
  | { status: "empty" }
  | { status: "unavailable" };

export type DeviceReportsResult =
  | { status: "ready"; reports: DeviceReportSummary[] }
  | { status: "unavailable" };

export async function getReportCatalog(): Promise<ReportCatalogResult> {
  await connection();
  try {
    const { categories, buildings } = await listActiveCatalog(db);
    if (categories.length === 0 || buildings.length === 0) {
      return { status: "empty" };
    }
    return { status: "ready", categories, buildings };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getDeviceReports(): Promise<DeviceReportsResult> {
  const deviceHash = await getDeviceHash();
  if (!deviceHash) return { status: "ready", reports: [] };

  try {
    const reports = await listReportsByDeviceHash(db, deviceHash);
    return { status: "ready", reports };
  } catch {
    return { status: "unavailable" };
  }
}

export type ReportViewerData = ReportDetailData & {
  afterPhotos: Awaited<ReturnType<typeof signedReportPhotos>>;
};

async function withAfterPhotos(record: ReportDetailData | null): Promise<ReportViewerData | null> {
  if (!record) return null;
  return { ...record, afterPhotos: await signedReportPhotos(record.id, ["report_after"]) };
}

export async function getReportForViewer(id: string): Promise<ReportViewerData | null> {
  const parsedId = reportIdSchema.safeParse(id);
  const requestHeaders = await headers();
  const deviceHash = await getDeviceHash();
  if (!parsedId.success) return null;

  const staff = await getStaffSession(requestHeaders);
  const allowAny = Boolean(staff && hasStaffPermission(staff.role, { report: ["read"] }));
  if (!allowAny && !deviceHash) return null;

  return withAfterPhotos(await findReportDetailById(db, parsedId.data, { deviceHash, allowAny }));
}

export async function getReportByTrackingToken(token: string): Promise<ReportViewerData | null> {
  await connection();
  const parsedToken = trackingTokenSchema.safeParse(token);
  const secret = readHashSecret();
  if (!parsedToken.success || !secret) return null;

  try {
    return await withAfterPhotos(
      await findReportDetailByTrackingTokenHash(db, hashTrackingToken(secret, parsedToken.data)),
    );
  } catch {
    return null;
  }
}

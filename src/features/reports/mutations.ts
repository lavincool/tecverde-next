import { and, eq, sql } from "drizzle-orm";

import { attachMedia } from "@/features/media/repository";
import { building, report, reportCategory, reportStatusEvent } from "@/server/db/schema";
import { hashValue, randomToken } from "@/server/security/hash";

import type { CreateReportInput } from "./schema";
import type { connectDatabase } from "@/server/db/connection";

type Database = ReturnType<typeof connectDatabase>;

export class ReportMutationError extends Error {
  constructor(readonly reason: "invalid_category" | "invalid_building" | "rate_limited") {
    super(reason);
  }
}

export function hashTrackingToken(secret: string, token: string): string {
  return hashValue(secret, "report-tracking", token);
}

export function hashDeviceId(secret: string, deviceId: string): string {
  return hashValue(secret, "device-id", deviceId);
}

export async function createReportRecord(
  database: Database,
  input: CreateReportInput & {
    deviceHash: string;
    ipHash: string;
    /** The draft id reserved before uploads; photo keys are grouped under it. */
    id?: string;
    mediaIds?: string[];
  },
  secret: string,
) {
  const trackingToken = randomToken(32);
  const trackingTokenHash = hashTrackingToken(secret, trackingToken);

  return database.transaction(
    async (tx) => {
      const [category] = await tx
        .select({ id: reportCategory.id, defaultPriority: reportCategory.defaultPriority })
        .from(reportCategory)
        .where(and(eq(reportCategory.id, input.categoryId), eq(reportCategory.isActive, true)))
        .limit(1);
      if (!category) throw new ReportMutationError("invalid_category");

      const [campusBuilding] = await tx
        .select({ id: building.id })
        .from(building)
        .where(and(eq(building.id, input.buildingId), eq(building.isActive, true)))
        .limit(1);
      if (!campusBuilding) throw new ReportMutationError("invalid_building");

      const [sequence] = await tx
        .select({ maxNumber: sql<number | null>`max(${report.number})` })
        .from(report);
      const number = (sequence?.maxNumber ?? 0) + 1;

      const [created] = await tx
        .insert(report)
        .values({
          ...(input.id ? { id: input.id } : {}),
          number,
          categoryId: category.id,
          buildingId: campusBuilding.id,
          locationReference: input.locationReference,
          description: input.description,
          status: "open",
          priority: category.defaultPriority,
          reporterName: input.reporterName,
          reporterEmail: input.reporterEmail,
          deviceHash: input.deviceHash,
          ipHash: input.ipHash,
          trackingTokenHash,
        })
        .returning({
          id: report.id,
          number: report.number,
          status: report.status,
          createdAt: report.createdAt,
        });
      if (!created) throw new Error("Report insertion failed.");

      if (input.mediaIds && input.mediaIds.length > 0) {
        await attachMedia(tx, {
          draftId: created.id,
          kind: "report_before",
          ids: input.mediaIds,
          owner: { reportId: created.id },
        });
      }

      await tx.insert(reportStatusEvent).values({
        reportId: created.id,
        fromStatus: null,
        toStatus: "open",
        actorUserId: null,
        note: null,
      });

      return {
        id: created.id,
        number: created.number,
        status: created.status,
        createdAt: created.createdAt,
        trackingToken,
      };
    },
    { behavior: "immediate" },
  );
}

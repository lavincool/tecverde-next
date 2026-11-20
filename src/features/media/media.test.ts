import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { v7 } from "uuid";

import { connectDatabase } from "@/server/db/connection";
import { building, media, report, reportCategory } from "@/server/db/schema";
import { isAuthorizedSchedule } from "@/server/security/schedule-auth";

import { migrateDatabase } from "../../../scripts/db-migrate";
import { seedCatalog } from "../../../scripts/seed";
import { createReportRecord } from "../reports/mutations";
import { fitWithin } from "./client/compress";
import {
  bucketForKind,
  buildMediaKey,
  isAcceptableUpload,
  isWebpSignature,
  MAX_MEDIA_BYTES,
} from "./keys";
import {
  countDraftMedia,
  insertPendingMedia,
  listAttachedMedia,
  listMediaToPurge,
} from "./repository";

describe("media keys and limits", () => {
  test("groups keys by entity, separates buckets and keeps the webp extension", () => {
    const reportId = v7();
    const objectId = v7();
    expect(buildMediaKey("report_before", reportId, objectId)).toBe(
      `reports/${reportId}/${objectId}.webp`,
    );
    expect(buildMediaKey("pet_gallery", reportId, objectId)).toBe(
      `pets/${reportId}/${objectId}.webp`,
    );
    expect(bucketForKind("pet_gallery")).toBe("public");
    expect(bucketForKind("report_before")).toBe("private");
    expect(bucketForKind("report_after")).toBe("private");
  });

  test("accepts only webp files within the size limit", () => {
    expect(isAcceptableUpload({ contentType: "image/webp", size: 200_000 })).toBe(true);
    expect(isAcceptableUpload({ contentType: "image/webp", size: MAX_MEDIA_BYTES + 1 })).toBe(
      false,
    );
    expect(isAcceptableUpload({ contentType: "image/jpeg", size: 200_000 })).toBe(false);
    expect(isAcceptableUpload({ contentType: "image/webp", size: 1.5 })).toBe(false);
  });

  test("detects the RIFF WEBP signature", () => {
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
    expect(isWebpSignature(webp)).toBe(true);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(isWebpSignature(png)).toBe(false);
    expect(isWebpSignature(webp.slice(0, 8))).toBe(false);
  });

  test("scales photos to the long edge without upscaling", () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe("media rows", () => {
  test("attach verified draft photos with the report and purge orphans", async () => {
    const database = connectDatabase({ url: "file::memory:" });
    try {
      await migrateDatabase(database);
      await seedCatalog(database);
      const [category] = await database.select().from(reportCategory).limit(1);
      const [campusBuilding] = await database.select().from(building).limit(1);
      if (!category || !campusBuilding) throw new Error("Expected seeded catalog.");

      const draftId = v7();
      const ids = [v7(), v7(), v7()];
      await insertPendingMedia(
        database,
        ids.map((id, sortOrder) => ({
          id,
          bucket: "private" as const,
          key: buildMediaKey("report_before", draftId, id),
          kind: "report_before" as const,
          draftId,
          sortOrder,
          contentType: "image/webp",
          size: 1000,
          width: 1600,
          height: 1200,
          dominantColor: "#336699",
          deviceHash: "device",
          uploadedByUserId: null,
        })),
      );
      expect(await countDraftMedia(database, draftId, "report_before")).toBe(3);

      const created = await createReportRecord(
        database,
        {
          categoryId: category.id,
          buildingId: campusBuilding.id,
          locationReference: "Pasillo",
          description: "Fuga",
          reporterName: null,
          reporterEmail: null,
          deviceHash: "device",
          ipHash: "ip",
          id: draftId,
          mediaIds: ids.slice(0, 2),
        },
        "tx-test-media-secret-with-no-production-access",
      );
      expect(created.id).toBe(draftId);

      const attached = await listAttachedMedia(database, { reportId: draftId }, ["report_before"]);
      expect(attached.map((row) => row.id)).toEqual(ids.slice(0, 2));

      const later = new Date(Date.now() + 25 * 60 * 60 * 1000);
      expect((await listMediaToPurge(database, later)).map((row) => row.id)).toEqual(ids.slice(2));

      await database
        .update(report)
        .set({ deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) })
        .where(eq(report.id, draftId));
      const purge = await listMediaToPurge(database, later);
      expect(purge.map((row) => row.id).toSorted()).toEqual(ids.toSorted());

      const [orphan] = await database
        .select()
        .from(media)
        .where(eq(media.id, ids[2] ?? ""));
      expect(orphan?.status).toBe("pending");
    } finally {
      database.$client.close();
    }
  });
});

function scheduleRequest(value?: string) {
  return new Request("https://tecverde.example/api/schedules/cleanup-media", {
    method: "POST",
    headers: value ? { authorization: value } : {},
  });
}

test("schedule routes require the bearer secret", () => {
  const secret = "s".repeat(40);
  expect(isAuthorizedSchedule(scheduleRequest(`Bearer ${secret}`), secret)).toBe(true);
  expect(isAuthorizedSchedule(scheduleRequest(`Bearer ${secret}x`), secret)).toBe(false);
  expect(isAuthorizedSchedule(scheduleRequest(), secret)).toBe(false);
  expect(isAuthorizedSchedule(scheduleRequest("Bearer short"), "short")).toBe(false);
});

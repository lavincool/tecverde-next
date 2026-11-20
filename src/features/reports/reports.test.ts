import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { v7 } from "uuid";

import { connectDatabase } from "@/server/db/connection";
import { building, report, reportCategory, reportStatusEvent } from "@/server/db/schema";

import { migrateDatabase } from "../../../scripts/db-migrate";
import { seedCatalog } from "../../../scripts/seed";
import { createReportRecord, hashDeviceId, hashTrackingToken } from "./mutations";
import {
  findReportDetailById,
  findReportDetailByTrackingTokenHash,
  listActiveCatalog,
  listReportsByDeviceHash,
} from "./repository";
import {
  createReportInputSchema,
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_LOCATION_MAX_LENGTH,
  reportIdSchema,
  trackingTokenSchema,
} from "./schema";

const testSecret = "tx-test-reports-secret-with-no-production-access";

async function withSeededDatabase(
  run: (database: ReturnType<typeof connectDatabase>) => Promise<void>,
) {
  const database = connectDatabase({ url: "file::memory:" });
  try {
    await migrateDatabase(database);
    await seedCatalog(database);
    await run(database);
  } finally {
    database.$client.close();
  }
}

describe("report input validation", () => {
  test("trims required text, normalizes optional contact, and rejects invalid inputs", () => {
    const categoryId = v7();
    const buildingId = v7();

    const valid = createReportInputSchema.safeParse({
      categoryId,
      buildingId,
      locationReference: "  Segundo piso, baño norte  ",
      description: "  Hay una fuga constante debajo del lavabo.  ",
      reporterName: "   ",
      reporterEmail: "  Persona@Tec.MX  ",
    });
    expect(valid.success).toBe(true);
    if (!valid.success) throw new Error("Expected valid input to parse.");
    expect(valid.data).toEqual({
      categoryId,
      buildingId,
      locationReference: "Segundo piso, baño norte",
      description: "Hay una fuga constante debajo del lavabo.",
      reporterName: null,
      reporterEmail: "persona@tec.mx",
    });

    const anonymous = createReportInputSchema.safeParse({
      categoryId,
      buildingId,
      locationReference: "Pasillo principal",
      description: "Luminaria apagada",
      reporterName: "",
      reporterEmail: "",
    });
    expect(anonymous.success).toBe(true);
    if (!anonymous.success) throw new Error("Expected anonymous input to parse.");
    expect(anonymous.data.reporterName).toBeNull();
    expect(anonymous.data.reporterEmail).toBeNull();

    expect(
      createReportInputSchema.safeParse({
        categoryId: "not-a-uuid",
        buildingId,
        locationReference: "Entrada",
        description: "Detalle",
      }).success,
    ).toBe(false);

    expect(
      createReportInputSchema.safeParse({
        categoryId,
        buildingId,
        locationReference: "   ",
        description: "Detalle",
      }).success,
    ).toBe(false);

    expect(
      createReportInputSchema.safeParse({
        categoryId,
        buildingId,
        locationReference: "a".repeat(REPORT_LOCATION_MAX_LENGTH + 1),
        description: "Detalle",
      }).success,
    ).toBe(false);

    expect(
      createReportInputSchema.safeParse({
        categoryId,
        buildingId,
        locationReference: "Entrada",
        description: "a".repeat(REPORT_DESCRIPTION_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);

    expect(
      createReportInputSchema.safeParse({
        categoryId,
        buildingId,
        locationReference: "Entrada",
        description: "Detalle",
        reporterEmail: "correo-invalido",
      }).success,
    ).toBe(false);

    expect(reportIdSchema.safeParse(v7()).success).toBe(true);
    expect(reportIdSchema.safeParse("invalid-id").success).toBe(false);
    expect(trackingTokenSchema.safeParse("a".repeat(43)).success).toBe(true);
    expect(trackingTokenSchema.safeParse("short").success).toBe(false);
  });
});

describe("report mutations and repository", () => {
  test("creates sequential reports, derives category priority, records initial timeline, and hashes tracking token", async () => {
    await withSeededDatabase(async (database) => {
      const { categories, buildings } = await listActiveCatalog(database);
      const waterLeak = categories.find((item) => item.slug === "water-leak");
      const restroomPaper = categories.find((item) => item.slug === "restroom-paper");
      const firstBuilding = buildings[0];
      if (!waterLeak || !restroomPaper || !firstBuilding) {
        throw new Error("Expected seeded categories and buildings.");
      }

      const deviceHash = hashDeviceId(testSecret, "device-one-123456789012");
      const ipHash = "hashed-ip-1";

      const first = await createReportRecord(
        database,
        {
          categoryId: waterLeak.id,
          buildingId: firstBuilding.id,
          locationReference: "Primer piso",
          description: "Fuga en bebedero",
          reporterName: null,
          reporterEmail: null,
          deviceHash,
          ipHash,
        },
        testSecret,
      );
      expect(first.number).toBe(1);
      expect(first.status).toBe("open");
      expect(trackingTokenSchema.safeParse(first.trackingToken).success).toBe(true);

      const second = await createReportRecord(
        database,
        {
          categoryId: restroomPaper.id,
          buildingId: firstBuilding.id,
          locationReference: "Segundo piso",
          description: "Sin papel en el baño",
          reporterName: "Luis",
          reporterEmail: "luis@example.test",
          deviceHash,
          ipHash,
        },
        testSecret,
      );
      expect(second.number).toBe(2);

      const [storedFirst] = await database.select().from(report).where(eq(report.id, first.id));
      const [storedSecond] = await database.select().from(report).where(eq(report.id, second.id));
      expect(storedFirst?.priority).toBe("high");
      expect(storedFirst?.trackingTokenHash).toBe(
        hashTrackingToken(testSecret, first.trackingToken),
      );
      expect(storedFirst?.trackingTokenHash).not.toBe(first.trackingToken);
      expect(storedSecond?.priority).toBe("normal");

      const firstEvents = await database
        .select()
        .from(reportStatusEvent)
        .where(eq(reportStatusEvent.reportId, first.id));
      expect(firstEvents).toHaveLength(1);
      expect(firstEvents[0]?.fromStatus).toBeNull();
      expect(firstEvents[0]?.toStatus).toBe("open");
    });
  });

  test("rejects unknown or inactive categories and buildings", async () => {
    await withSeededDatabase(async (database) => {
      const { categories, buildings } = await listActiveCatalog(database);
      const activeCategory = categories[0];
      const activeBuilding = buildings[0];
      if (!activeCategory || !activeBuilding) throw new Error("Expected seeded catalog.");

      await database
        .update(reportCategory)
        .set({ isActive: false })
        .where(eq(reportCategory.id, activeCategory.id));
      await database
        .update(building)
        .set({ isActive: false })
        .where(eq(building.id, activeBuilding.id));

      const filteredCatalog = await listActiveCatalog(database);
      expect(filteredCatalog.categories.some((item) => item.id === activeCategory.id)).toBe(false);
      expect(filteredCatalog.buildings.some((item) => item.id === activeBuilding.id)).toBe(false);

      const remainingBuilding = filteredCatalog.buildings[0];
      const remainingCategory = filteredCatalog.categories[0];
      if (!remainingBuilding || !remainingCategory) throw new Error("Expected remaining catalog.");

      expect(
        await createReportRecord(
          database,
          {
            categoryId: activeCategory.id,
            buildingId: remainingBuilding.id,
            locationReference: "Pasillo",
            description: "Prueba",
            reporterName: null,
            reporterEmail: null,
            deviceHash: "device-hash",
            ipHash: "ip-hash",
          },
          testSecret,
        ).catch((error: unknown) => error),
      ).toHaveProperty("reason", "invalid_category");

      expect(
        await createReportRecord(
          database,
          {
            categoryId: remainingCategory.id,
            buildingId: activeBuilding.id,
            locationReference: "Pasillo",
            description: "Prueba",
            reporterName: null,
            reporterEmail: null,
            deviceHash: "device-hash",
            ipHash: "ip-hash",
          },
          testSecret,
        ).catch((error: unknown) => error),
      ).toHaveProperty("reason", "invalid_building");

      expect(
        await createReportRecord(
          database,
          {
            categoryId: v7(),
            buildingId: remainingBuilding.id,
            locationReference: "Pasillo",
            description: "Prueba",
            reporterName: null,
            reporterEmail: null,
            deviceHash: "device-hash",
            ipHash: "ip-hash",
          },
          testSecret,
        ).catch((error: unknown) => error),
      ).toHaveProperty("reason", "invalid_category");
    });
  });

  test("enforces device scoping, staff access, capability tracking tokens, and soft-delete exclusion", async () => {
    await withSeededDatabase(async (database) => {
      const { categories, buildings } = await listActiveCatalog(database);
      const category = categories[0];
      const campusBuilding = buildings[0];
      if (!category || !campusBuilding) throw new Error("Expected seeded catalog.");

      const deviceA = hashDeviceId(testSecret, "device-alpha");
      const deviceB = hashDeviceId(testSecret, "device-bravo");

      const first = await createReportRecord(
        database,
        {
          categoryId: category.id,
          buildingId: campusBuilding.id,
          locationReference: "Planta baja",
          description: "Primer reporte",
          reporterName: "Secreto",
          reporterEmail: "secreto@example.test",
          deviceHash: deviceA,
          ipHash: "ip-a",
        },
        testSecret,
      );

      const second = await createReportRecord(
        database,
        {
          categoryId: category.id,
          buildingId: campusBuilding.id,
          locationReference: "Planta alta",
          description: "Segundo reporte",
          reporterName: null,
          reporterEmail: null,
          deviceHash: deviceA,
          ipHash: "ip-a",
        },
        testSecret,
      );

      const other = await createReportRecord(
        database,
        {
          categoryId: category.id,
          buildingId: campusBuilding.id,
          locationReference: "Patio",
          description: "Reporte de otro dispositivo",
          reporterName: null,
          reporterEmail: null,
          deviceHash: deviceB,
          ipHash: "ip-b",
        },
        testSecret,
      );

      const deviceAList = await listReportsByDeviceHash(database, deviceA);
      expect(deviceAList.map((item) => item.id)).toEqual([second.id, first.id]);

      const deviceBList = await listReportsByDeviceHash(database, deviceB);
      expect(deviceBList.map((item) => item.id)).toEqual([other.id]);

      // Matching device can view report detail, without sensitive columns.
      const ownDetail = await findReportDetailById(database, first.id, {
        deviceHash: deviceA,
        allowAny: false,
      });
      expect(ownDetail).not.toBeNull();
      expect(ownDetail?.number).toBe(1);
      expect(ownDetail?.events).toHaveLength(1);
      expect(ownDetail).not.toHaveProperty("deviceHash");
      expect(ownDetail).not.toHaveProperty("ipHash");
      expect(ownDetail).not.toHaveProperty("trackingTokenHash");
      expect(ownDetail).not.toHaveProperty("reporterEmail");
      expect(ownDetail).not.toHaveProperty("reporterName");

      // Different device or anonymous viewer without device cookie is denied.
      expect(
        await findReportDetailById(database, first.id, {
          deviceHash: deviceB,
          allowAny: false,
        }),
      ).toBeNull();
      expect(
        await findReportDetailById(database, first.id, {
          allowAny: false,
        }),
      ).toBeNull();

      // Staff with read permission can view any report.
      const staffDetail = await findReportDetailById(database, first.id, {
        allowAny: true,
      });
      expect(staffDetail?.id).toBe(first.id);

      // Tracking token grants read access without a device cookie.
      const tracked = await findReportDetailByTrackingTokenHash(
        database,
        hashTrackingToken(testSecret, first.trackingToken),
      );
      expect(tracked?.id).toBe(first.id);
      expect(tracked?.events).toHaveLength(1);

      expect(
        await findReportDetailByTrackingTokenHash(
          database,
          hashTrackingToken(testSecret, "invalid-tracking-token-value-1234567890123"),
        ),
      ).toBeNull();

      // Soft-deleting hides the report from list, detail, and tracking queries.
      await database.update(report).set({ deletedAt: new Date() }).where(eq(report.id, first.id));

      expect((await listReportsByDeviceHash(database, deviceA)).map((item) => item.id)).toEqual([
        second.id,
      ]);
      expect(
        await findReportDetailById(database, first.id, { deviceHash: deviceA, allowAny: true }),
      ).toBeNull();
      expect(
        await findReportDetailByTrackingTokenHash(
          database,
          hashTrackingToken(testSecret, first.trackingToken),
        ),
      ).toBeNull();
    });
  });
});

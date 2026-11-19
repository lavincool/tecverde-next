import { expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { connectDatabase } from "@/server/db/connection";
import { building, report, reportCategory, reportConfirmation } from "@/server/db/schema";

import { migrateDatabase } from "../../../../scripts/db-migrate";
import { seedCatalog } from "../../../../scripts/seed";

test("migrations and idempotent seeds enforce foreign keys, enum checks and report confirmation uniqueness", async () => {
  const database = connectDatabase({ url: "file::memory:" });
  try {
    await migrateDatabase(database);
    await migrateDatabase(database);
    await seedCatalog(database);
    const firstCatalog = await database.select().from(building).orderBy(building.sortOrder);
    await seedCatalog(database);
    expect(await database.select().from(building).orderBy(building.sortOrder)).toEqual(
      firstCatalog,
    );
    expect(firstCatalog).toHaveLength(5);

    const [category] = await database
      .select()
      .from(reportCategory)
      .where(eq(reportCategory.slug, "restroom-paper"));
    const campusBuilding = firstCatalog[0];
    if (!category || !campusBuilding) throw new Error("Expected the seeded campus catalog.");

    const draft = {
      number: 1,
      buildingId: campusBuilding.id,
      categoryId: category.id,
      locationReference: "Primer piso",
      description: "Prueba de reporte",
      priority: category.defaultPriority,
      deviceHash: "report-device",
      ipHash: "report-ip",
      trackingTokenHash: "report-token",
    };

    expect((await database.$client.execute("pragma foreign_keys")).rows[0]?.[0]).toBe(1);
    expect(
      await database
        .insert(report)
        .values({ ...draft, buildingId: "unknown" })
        .run()
        .catch((error: unknown) => error),
    ).toBeInstanceOf(Error);
    expect(
      await database
        .insert(report)
        .values({ ...draft, status: sql`'invalid'` })
        .run()
        .catch((error: unknown) => error),
    ).toBeInstanceOf(Error);

    const [created] = await database.insert(report).values(draft).returning();
    if (!created) throw new Error("Expected the inserted report.");
    expect(
      await database
        .delete(building)
        .where(eq(building.id, campusBuilding.id))
        .run()
        .catch((error: unknown) => error),
    ).toBeInstanceOf(Error);

    const confirmation = { reportId: created.id, deviceHash: "other-device" };
    await database.insert(reportConfirmation).values(confirmation);
    expect(
      await database
        .insert(reportConfirmation)
        .values(confirmation)
        .run()
        .catch((error: unknown) => error),
    ).toBeInstanceOf(Error);
    await database.delete(report).where(eq(report.id, created.id));
    expect(await database.select().from(reportConfirmation)).toEqual([]);
  } finally {
    database.$client.close();
  }
});

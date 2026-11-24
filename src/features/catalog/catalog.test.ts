import { expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { connectDatabase } from "@/server/db/connection";
import { auditLog, building, reportCategory, user } from "@/server/db/schema";

import { migrateDatabase } from "../../../scripts/db-migrate";
import { seedCatalog } from "../../../scripts/seed";
import {
  buildingInputSchema,
  CatalogError,
  categoryInputSchema,
  listFullCatalog,
  upsertBuildingRecord,
  upsertCategoryRecord,
} from "./repository";

test("admins create, edit and deactivate catalog entries with unique slugs", async () => {
  const database = connectDatabase({ url: "file::memory:" });
  try {
    await migrateDatabase(database);
    await seedCatalog(database);
    await database.insert(user).values({
      id: "actor",
      name: "Admin",
      email: "admin@tecverde.test",
      emailVerified: true,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await upsertBuildingRecord(
      database,
      buildingInputSchema.parse({
        slug: "Edificio-B",
        name: "Edificio B",
        shortName: "Edif. B",
        sortOrder: "7",
        isActive: true,
      }),
      "actor",
    );
    const [row] = await database.select().from(building).where(eq(building.id, created.id));
    expect(row).toMatchObject({ slug: "edificio-b", sortOrder: 7, isActive: true });

    await upsertBuildingRecord(
      database,
      buildingInputSchema.parse({
        id: created.id,
        slug: "edificio-b",
        name: "Edificio B",
        shortName: "B",
        sortOrder: 7,
        isActive: false,
      }),
      "actor",
    );
    const { buildings } = await listFullCatalog(database);
    expect(buildings.find((item) => item.id === created.id)?.isActive).toBe(false);

    const duplicate = await upsertBuildingRecord(
      database,
      buildingInputSchema.parse({
        slug: "library",
        name: "Otra",
        shortName: "Otra",
        sortOrder: 0,
        isActive: true,
      }),
      "actor",
    ).catch((error: unknown) => error);
    expect(duplicate).toBeInstanceOf(CatalogError);

    expect(
      categoryInputSchema.safeParse({
        slug: "goteras",
        name: "Goteras",
        iconKey: "not-an-icon",
        defaultPriority: "high",
        sortOrder: 1,
        isActive: true,
      }).success,
    ).toBe(false);
    await upsertCategoryRecord(
      database,
      categoryInputSchema.parse({
        slug: "goteras",
        name: "Goteras",
        iconKey: "droplets",
        defaultPriority: "high",
        sortOrder: 1,
        isActive: true,
      }),
      "actor",
    );
    const { categories } = await listFullCatalog(database);
    expect(categories.some((item) => item.slug === "goteras")).toBe(true);
    expect(
      (await database.select().from(auditLog)).map((entry) => entry.action).toSorted(),
    ).toEqual(["catalog.create_building", "catalog.create_category", "catalog.update_building"]);
  } finally {
    database.$client.close();
  }
});

test("the air conditioning migration adds the category only to an existing catalog", async () => {
  const database = connectDatabase({ url: "file::memory:" });
  const migration = await Bun.file(
    new URL(
      "../../../drizzle/20261124060241_air_conditioning_category/migration.sql",
      import.meta.url,
    ),
  ).text();
  try {
    await migrateDatabase(database);
    // A fresh database keeps an empty catalog for the seed script or the admins to fill.
    expect(await database.select().from(reportCategory)).toEqual([]);

    await seedCatalog(database);
    await database.delete(reportCategory).where(eq(reportCategory.slug, "air-conditioning"));
    await database.$client.executeMultiple(migration);
    // Running it again, or after an admin created the slug, never duplicates or overwrites it.
    await database.$client.executeMultiple(migration);

    const rows = await database
      .select()
      .from(reportCategory)
      .where(eq(reportCategory.slug, "air-conditioning"));
    const [other] = await database
      .select()
      .from(reportCategory)
      .where(eq(reportCategory.slug, "other"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      iconKey: "air-vent",
      isActive: true,
      sortOrder: other?.sortOrder,
    });
    expect(z.uuidv7().safeParse(rows[0]?.id).success).toBe(true);
  } finally {
    database.$client.close();
  }
});

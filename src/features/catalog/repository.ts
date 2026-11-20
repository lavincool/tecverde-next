import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { reportPriorities } from "@/features/reports/enums";
import { building, reportCategory } from "@/server/db/schema/catalog";
import { auditLog } from "@/server/db/schema/staff";

import { categoryIcons } from "./icons";

import type { connectDatabase } from "@/server/db/connection";

type Database = ReturnType<typeof connectDatabase>;

const iconKeySchema = z
  .string()
  .refine((value): value is keyof typeof categoryIcons => Object.hasOwn(categoryIcons, value));
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z\d]+(?:-[a-z\d]+)*$/)
  .max(60);
const optionalId = z
  .string()
  .default("")
  .transform((value) => (value.length > 0 ? value : null))
  .pipe(z.uuidv7().nullable());

export const buildingInputSchema = z.object({
  id: optionalId,
  slug,
  name: z.string().trim().min(1).max(80),
  shortName: z.string().trim().min(1).max(40),
  sortOrder: z.coerce.number().int().min(0).max(999),
  isActive: z.boolean(),
});

export const categoryInputSchema = z.object({
  id: optionalId,
  slug,
  name: z.string().trim().min(1).max(80),
  iconKey: iconKeySchema,
  defaultPriority: z.enum(reportPriorities),
  sortOrder: z.coerce.number().int().min(0).max(999),
  isActive: z.boolean(),
});

export class CatalogError extends Error {
  constructor(readonly reason: "duplicate_slug" | "not_found") {
    super(reason);
  }
}

function isUniqueViolation(error: unknown) {
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const text = error instanceof Error ? `${error.message} ${cause}` : "";
  return /UNIQUE constraint failed/i.test(text);
}

export async function listFullCatalog(database: Database) {
  const [buildings, categories] = await Promise.all([
    database.select().from(building).orderBy(asc(building.sortOrder), asc(building.name)),
    database
      .select()
      .from(reportCategory)
      .orderBy(asc(reportCategory.sortOrder), asc(reportCategory.name)),
  ]);
  return { buildings, categories };
}

/**
 * Creates or edits a building. Buildings referenced by reports cannot be deleted
 * (RESTRICT), so they are deactivated instead.
 */
export async function upsertBuildingRecord(
  database: Database,
  input: z.output<typeof buildingInputSchema>,
  actorId: string,
) {
  const { id, ...values } = input;
  try {
    return await database.transaction(async (tx) => {
      const [saved] = id
        ? await tx
            .update(building)
            .set(values)
            .where(eq(building.id, id))
            .returning({ id: building.id })
        : await tx.insert(building).values(values).returning({ id: building.id });
      if (!saved) throw new CatalogError("not_found");
      await tx.insert(auditLog).values({
        actorUserId: actorId,
        action: id ? "catalog.update_building" : "catalog.create_building",
        entityType: "building",
        entityId: saved.id,
        metadata: { slug: values.slug, isActive: values.isActive },
      });
      return saved;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new CatalogError("duplicate_slug");
    throw error;
  }
}

export async function upsertCategoryRecord(
  database: Database,
  input: z.output<typeof categoryInputSchema>,
  actorId: string,
) {
  const { id, ...values } = input;
  try {
    return await database.transaction(async (tx) => {
      const [saved] = id
        ? await tx
            .update(reportCategory)
            .set(values)
            .where(eq(reportCategory.id, id))
            .returning({ id: reportCategory.id })
        : await tx.insert(reportCategory).values(values).returning({ id: reportCategory.id });
      if (!saved) throw new CatalogError("not_found");
      await tx.insert(auditLog).values({
        actorUserId: actorId,
        action: id ? "catalog.update_category" : "catalog.create_category",
        entityType: "report_category",
        entityId: saved.id,
        metadata: { slug: values.slug, isActive: values.isActive },
      });
      return saved;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new CatalogError("duplicate_slug");
    throw error;
  }
}

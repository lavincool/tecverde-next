import { expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { v7 } from "uuid";

import { createAdoptionRequestRecord, createPetRecord } from "@/features/adoption/repository";
import { createPetInputSchema, createRequestInputSchema } from "@/features/adoption/schema";
import { issueActionToken } from "@/features/notifications/action-tokens";
import { createReportRecord } from "@/features/reports/mutations";
import { connectDatabase } from "@/server/db/connection";
import {
  actionToken,
  adoptionRequest,
  building,
  pet,
  report,
  reportCategory,
  reportStatusEvent,
} from "@/server/db/schema";

import { migrateDatabase } from "../../../scripts/db-migrate";
import { seedCatalog } from "../../../scripts/seed";
import { applyRetention, loadDigest } from "./repository";

const secret = "tx-test-retention-secret-with-no-production-access";
const DAY = 24 * 60 * 60 * 1000;

test("retention clears old contacts, hard-deletes old soft deletes and keeps recent data", async () => {
  const database = connectDatabase({ url: "file::memory:" });
  try {
    await migrateDatabase(database);
    await seedCatalog(database);
    const [category] = await database.select().from(reportCategory).limit(1);
    const [campusBuilding] = await database.select().from(building).limit(1);
    if (!category || !campusBuilding) throw new Error("Expected seeded catalog.");

    const makeReport = () =>
      createReportRecord(
        database,
        {
          categoryId: category.id,
          buildingId: campusBuilding.id,
          locationReference: "Pasillo",
          description: "Fuga",
          reporterName: "Persona",
          reporterEmail: "persona@example.com",
          deviceHash: "device",
          ipHash: "ip",
        },
        secret,
      );
    const oldClosed = await makeReport();
    const recentClosed = await makeReport();
    const deleted = await makeReport();
    const open = await makeReport();

    const now = new Date();
    const old = new Date(now.getTime() - 200 * DAY);
    await database
      .update(report)
      .set({ status: "resolved", updatedAt: old })
      .where(eq(report.id, oldClosed.id));
    await database.update(report).set({ status: "resolved" }).where(eq(report.id, recentClosed.id));
    await database
      .update(report)
      .set({ deletedAt: new Date(now.getTime() - 31 * DAY) })
      .where(eq(report.id, deleted.id));
    await database.update(report).set({ updatedAt: old }).where(eq(report.id, open.id));

    const petInput = createPetInputSchema.parse({
      name: "Canela",
      species: "dog",
      sex: "female",
      ageGroup: "young",
      size: "medium",
      vaccinated: "yes",
      sterilized: "no",
      dewormed: "unknown",
      story: "Le gusta dormir bajo los árboles del campus.",
      posterName: "Persona",
      posterEmail: "poster@example.com",
      consent: "on",
    });
    const createdPet = await createPetRecord(
      database,
      { ...petInput, id: v7(), deviceHash: "d", ipHash: "i", mediaIds: [] },
      secret,
    );
    await database
      .update(pet)
      .set({ status: "available", approvedAt: now })
      .where(eq(pet.id, createdPet.id));
    const request = await createAdoptionRequestRecord(database, {
      ...createRequestInputSchema.parse({
        fullName: "Adoptante",
        email: "adopta@example.com",
        campusRelationship: "student",
        housingType: "house",
        hasOtherPets: "no",
        hasExperience: "yes",
        motivation: "Tengo tiempo y espacio para cuidarla bien.",
        consent: "on",
      }),
      petId: createdPet.id,
      deviceHash: "d",
      ipHash: "i",
    });
    await database
      .update(adoptionRequest)
      .set({ status: "declined", closedAt: old })
      .where(eq(adoptionRequest.id, request.id));
    await issueActionToken(
      database,
      { purpose: "verify_report_email", subjectId: open.id },
      secret,
      new Date(now.getTime() - 3 * DAY),
    );

    const result = await applyRetention(database, now);
    expect(result).toMatchObject({
      deletedReports: 1,
      clearedReportContacts: 1,
      clearedRequestContacts: 1,
      clearedPosterContacts: 0,
      deletedTokens: 1,
    });

    const rows = new Map((await database.select().from(report)).map((row) => [row.id, row]));
    expect(rows.has(deleted.id)).toBe(false);
    expect(rows.get(oldClosed.id)?.reporterEmail).toBeNull();
    expect(rows.get(recentClosed.id)?.reporterEmail).toBe("persona@example.com");
    expect(rows.get(open.id)?.reporterEmail).toBe("persona@example.com");
    expect(
      await database
        .select()
        .from(reportStatusEvent)
        .where(eq(reportStatusEvent.reportId, deleted.id)),
    ).toHaveLength(0);
    const [cleared] = await database
      .select()
      .from(adoptionRequest)
      .where(eq(adoptionRequest.id, request.id));
    expect(cleared?.email).toBeNull();
    expect(await database.select().from(actionToken)).toHaveLength(0);

    const digest = await loadDigest(database, now);
    expect(digest.newReports).toBe(3);
    expect(digest.backlog).toBe(1);
  } finally {
    database.$client.close();
  }
});

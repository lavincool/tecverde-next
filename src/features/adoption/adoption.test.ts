import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { v7 } from "uuid";

import { issueActionToken } from "@/features/notifications/action-tokens";
import { applyEmailVerification } from "@/features/notifications/verification";
import { connectDatabase } from "@/server/db/connection";
import { adoptionRequest, pet, user } from "@/server/db/schema";

import { migrateDatabase } from "../../../scripts/db-migrate";
import { seedCatalog } from "../../../scripts/seed";
import {
  AdoptionError,
  approvePetRecord,
  changePetStatusByStaff,
  createAdoptionRequestRecord,
  createPetRecord,
  findPetByManageTokenHash,
  findPublicPetBySlug,
  hashManageToken,
  listAdoptedPets,
  listModerationQueue,
  listPublicPets,
  posterChangeStatus,
  rejectPetRecord,
  updateRequestStatusRecord,
} from "./repository";
import { createPetInputSchema, createRequestInputSchema, slugify } from "./schema";
import { canTransitionPet, nextPetStatuses } from "./status-machine";

type Database = ReturnType<typeof connectDatabase>;
const secret = "tx-test-adoption-secret-with-no-production-access";

const petForm = {
  name: "Canela",
  species: "dog",
  speciesOther: "",
  sex: "female",
  ageGroup: "young",
  size: "medium",
  temperament: ["calm", "sociable"],
  vaccinated: "yes",
  sterilized: "unknown",
  dewormed: "no",
  healthNotes: "",
  buildingId: "",
  areaReference: "Junto a la cafetería",
  story: "Le gusta dormir bajo los árboles y saluda a todos en la entrada.",
  posterName: "Persona que publica",
  posterEmail: "Poster@Example.com",
  posterPhone: "868 123 4567",
  consent: "on",
};

const requestForm = {
  fullName: "Persona adoptante",
  email: "adopta@example.com",
  phone: "",
  campusRelationship: "student",
  housingType: "house",
  hasOtherPets: "no",
  hasExperience: "yes",
  motivation: "Tengo patio y tiempo para cuidarla todos los días.",
  consent: "on",
};

async function withDatabase(run: (database: Database) => Promise<void>) {
  const database = connectDatabase({ url: "file::memory:" });
  try {
    await migrateDatabase(database);
    await seedCatalog(database);
    await run(database);
  } finally {
    database.$client.close();
  }
}

async function insertModerator(database: Database) {
  const id = v7();
  await database.insert(user).values({
    id,
    name: "Moderación",
    email: "mod@tecverde.test",
    emailVerified: true,
    role: "moderator",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { id, role: "moderator" as const };
}

async function postPet(database: Database) {
  const input = createPetInputSchema.parse(petForm);
  return createPetRecord(
    database,
    { ...input, id: v7(), deviceHash: "device", ipHash: "ip", mediaIds: [] },
    secret,
  );
}

async function verifyPoster(database: Database, petId: string) {
  const token = await issueActionToken(
    database,
    { purpose: "verify_pet_post", subjectId: petId },
    secret,
  );
  return applyEmailVerification(database, token, secret);
}

async function reasonOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  );
  return error instanceof AdoptionError ? error.reason : error;
}

describe("pet status machine", () => {
  test("separates moderators, admins and posters", () => {
    const moderator = { kind: "staff", role: "moderator" } as const;
    expect(nextPetStatuses("pending_approval", moderator)).toEqual(["available", "archived"]);
    expect(canTransitionPet("archived", "available", moderator)).toBe(false);
    expect(canTransitionPet("archived", "available", { kind: "staff", role: "admin" })).toBe(true);
    expect(nextPetStatuses("pending_approval", { kind: "poster" })).toEqual([]);
    expect(canTransitionPet("in_process", "adopted", { kind: "poster" })).toBe(true);
    expect(canTransitionPet("adopted", "available", { kind: "poster" })).toBe(false);
  });
});

describe("adoption validation", () => {
  test("normalizes contact data and requires consent and the other species", () => {
    const parsed = createPetInputSchema.parse(petForm);
    expect(parsed.posterEmail).toBe("poster@example.com");
    expect(parsed.healthNotes).toBeNull();
    expect(createPetInputSchema.safeParse({ ...petForm, consent: "" }).success).toBe(false);
    expect(createPetInputSchema.safeParse({ ...petForm, species: "other" }).success).toBe(false);
    expect(createRequestInputSchema.parse(requestForm).hasOtherPets).toBe(false);
    expect(
      createRequestInputSchema.safeParse({ ...requestForm, motivation: "corto" }).success,
    ).toBe(false);
    expect(slugify("  Ñandú Café!! ")).toBe("nandu-cafe");
  });
});

describe("adoption flow", () => {
  test("keeps posts private until email verification and approval", async () => {
    await withDatabase(async (database) => {
      const moderator = await insertModerator(database);
      const created = await postPet(database);

      expect(await listPublicPets(database, {})).toHaveLength(0);
      expect(await findPublicPetBySlug(database, created.slug)).toBeNull();
      expect(await listModerationQueue(database)).toHaveLength(0);

      expect((await verifyPoster(database, created.id))?.purpose).toBe("verify_pet_post");
      expect((await listModerationQueue(database)).map((row) => row.id)).toEqual([created.id]);

      const change = await approvePetRecord(database, created.id, moderator);
      expect(change).toMatchObject({ from: "pending_approval", to: "available" });
      expect(change.posterEmail).toBe("poster@example.com");

      const gallery = await listPublicPets(database, { species: "dog" });
      expect(gallery.map((item) => item.id)).toEqual([created.id]);
      expect(await listPublicPets(database, { species: "cat" })).toHaveLength(0);
    });
  });

  test("public DTOs never expose poster or requester contact data", async () => {
    await withDatabase(async (database) => {
      const moderator = await insertModerator(database);
      const created = await postPet(database);
      await verifyPoster(database, created.id);
      await approvePetRecord(database, created.id, moderator);

      const detail = await findPublicPetBySlug(database, created.slug);
      const [card] = await listPublicPets(database, {});
      const serialized = JSON.stringify({ detail, card });
      for (const secretValue of [
        "poster@example.com",
        "868 123 4567",
        "Persona que publica",
        "device",
        "ip",
      ]) {
        expect(serialized.includes(`"${secretValue}"`)).toBe(false);
      }
      expect(Object.keys(detail ?? {})).not.toContain("posterEmail");
      expect(Object.keys(detail ?? {})).not.toContain("manageTokenHash");
    });
  });

  test("rejects with a reason and blocks invalid transitions", async () => {
    await withDatabase(async (database) => {
      const moderator = await insertModerator(database);
      const created = await postPet(database);
      expect(
        await reasonOf(
          changePetStatusByStaff(
            database,
            { petId: created.id, status: "adopted", note: null },
            moderator,
          ),
        ),
      ).toBe("invalid_transition");
      const rejected = await rejectPetRecord(
        database,
        { petId: created.id, reason: "Fotos poco claras" },
        moderator,
      );
      expect(rejected.to).toBe("archived");
      const [row] = await database.select().from(pet).where(eq(pet.id, created.id));
      expect(row?.rejectionReason).toBe("Fotos poco claras");
      expect(await reasonOf(approvePetRecord(database, created.id, moderator))).toBe(
        "invalid_transition",
      );
    });
  });

  test("accepts one active request per email, verifies it and lets the poster manage it", async () => {
    await withDatabase(async (database) => {
      const moderator = await insertModerator(database);
      const created = await postPet(database);
      await verifyPoster(database, created.id);

      const input = createRequestInputSchema.parse(requestForm);
      const request = { ...input, petId: created.id, deviceHash: "device-b", ipHash: "ip-b" };
      expect(await reasonOf(createAdoptionRequestRecord(database, request))).toBe("not_available");

      await approvePetRecord(database, created.id, moderator);
      const first = await createAdoptionRequestRecord(database, request);
      expect(
        await reasonOf(
          createAdoptionRequestRecord(database, {
            ...request,
            email: "ADOPTA@example.com".toLowerCase(),
          }),
        ),
      ).toBe("duplicate_request");

      const managed = await findPetByManageTokenHash(
        database,
        hashManageToken(secret, created.manageToken),
      );
      expect(managed?.requests).toHaveLength(0);

      const token = await issueActionToken(
        database,
        { purpose: "verify_adoption_request", subjectId: first.id },
        secret,
      );
      expect((await applyEmailVerification(database, token, secret))?.purpose).toBe(
        "verify_adoption_request",
      );
      const afterVerify = await findPetByManageTokenHash(
        database,
        hashManageToken(secret, created.manageToken),
      );
      expect(afterVerify?.requests.map((item) => item.email)).toEqual(["adopta@example.com"]);

      await updateRequestStatusRecord(
        database,
        { requestId: first.id, status: "declined", petId: created.id },
        { userId: null },
      );
      const [declined] = await database
        .select()
        .from(adoptionRequest)
        .where(eq(adoptionRequest.id, first.id));
      expect(declined?.status).toBe("declined");
      expect(declined?.closedAt).toBeInstanceOf(Date);
      // A declined request no longer blocks a new one from the same email.
      expect((await createAdoptionRequestRecord(database, request)).id).toBeString();

      await posterChangeStatus(database, { petId: created.id, status: "in_process" });
      await posterChangeStatus(database, { petId: created.id, status: "adopted" });
      expect(
        await reasonOf(posterChangeStatus(database, { petId: created.id, status: "available" })),
      ).toBe("invalid_transition");
      expect((await listAdoptedPets(database)).map((item) => item.id)).toEqual([created.id]);
      expect(
        await findPetByManageTokenHash(database, hashManageToken(secret, "x".repeat(43))),
      ).toBeNull();
    });
  });
});

import { and, asc, count, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { attachMedia } from "@/features/media/repository";
import { adoptionRequest, pet, petStatusEvent } from "@/server/db/schema/adoption";
import { user } from "@/server/db/schema/auth";
import { building } from "@/server/db/schema/catalog";
import { media } from "@/server/db/schema/media";
import { auditLog } from "@/server/db/schema/staff";
import { hashValue, randomToken } from "@/server/security/hash";

import { slugify } from "./schema";
import { canTransitionPet, publicPetStatuses } from "./status-machine";

import type {
  AgeGroup,
  CampusRelationship,
  HealthState,
  HousingType,
  PetStatus,
  RequestStatus,
  Sex,
  Size,
  Species,
  Temperament,
} from "./enums";
import type { CreatePetInput, CreateRequestInput, GalleryFilters } from "./schema";
import type { PetActor } from "./status-machine";
import type { connectDatabase } from "@/server/db/connection";
import type { SQL } from "drizzle-orm";

type Database = ReturnType<typeof connectDatabase>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export class AdoptionError extends Error {
  constructor(
    readonly reason:
      | "not_found"
      | "invalid_transition"
      | "invalid_building"
      | "duplicate_request"
      | "not_available"
      | "stale",
  ) {
    super(reason);
  }
}

export function hashManageToken(secret: string, token: string) {
  return hashValue(secret, "pet-manage", token);
}

/* ------------------------------------------------------------------ */
/* Public DTOs: never include poster or requester contact data.       */
/* ------------------------------------------------------------------ */

export type PublicPhoto = {
  id: string;
  key: string;
  width: number;
  height: number;
  dominantColor: string;
};

export type PublicPetCard = {
  id: string;
  slug: string;
  name: string;
  species: Species;
  speciesOther: string | null;
  sex: Sex;
  ageGroup: AgeGroup;
  size: Size;
  status: PetStatus;
  areaName: string | null;
  cover: PublicPhoto | null;
};

export type PublicPetDetail = PublicPetCard & {
  temperament: Temperament[];
  vaccinated: HealthState;
  sterilized: HealthState;
  dewormed: HealthState;
  healthNotes: string | null;
  areaReference: string | null;
  story: string;
  successStory: string | null;
  adoptedAt: Date | null;
  photos: PublicPhoto[];
};

const cardColumns = {
  id: pet.id,
  slug: pet.slug,
  name: pet.name,
  species: pet.species,
  speciesOther: pet.speciesOther,
  sex: pet.sex,
  ageGroup: pet.ageGroup,
  size: pet.size,
  status: pet.status,
  areaName: building.shortName,
  coverMediaId: pet.coverMediaId,
};

const photoColumns = {
  id: media.id,
  petId: media.petId,
  key: media.key,
  width: media.width,
  height: media.height,
  dominantColor: media.dominantColor,
};

async function photosFor(database: Database, petIds: string[]) {
  if (petIds.length === 0) return new Map<string, PublicPhoto[]>();
  const rows = await database
    .select(photoColumns)
    .from(media)
    .where(
      and(
        inArray(media.petId, petIds),
        eq(media.status, "attached"),
        eq(media.kind, "pet_gallery"),
      ),
    )
    .orderBy(asc(media.sortOrder), asc(media.id));
  const grouped = new Map<string, PublicPhoto[]>();
  for (const { petId, ...photo } of rows) {
    if (!petId) continue;
    grouped.set(petId, [...(grouped.get(petId) ?? []), photo]);
  }
  return grouped;
}

function pickCover(photos: PublicPhoto[] | undefined, coverMediaId: string | null) {
  if (!photos || photos.length === 0) return null;
  return photos.find((photo) => photo.id === coverMediaId) ?? photos[0] ?? null;
}

function toCard(
  row: { coverMediaId: string | null } & Omit<PublicPetCard, "cover">,
  photos: Map<string, PublicPhoto[]>,
): PublicPetCard {
  const { coverMediaId, ...rest } = row;
  return { ...rest, cover: pickCover(photos.get(row.id), coverMediaId) };
}

const publicFilter = and(
  inArray(pet.status, [...publicPetStatuses]),
  isNotNull(pet.approvedAt),
  isNull(pet.deletedAt),
);

export async function listPublicPets(
  database: Database,
  filters: GalleryFilters,
  limit = 60,
): Promise<PublicPetCard[]> {
  const conditions: (SQL | undefined)[] = [publicFilter];
  if (filters.species) conditions.push(eq(pet.species, filters.species));
  if (filters.sex) conditions.push(eq(pet.sex, filters.sex));
  if (filters.size) conditions.push(eq(pet.size, filters.size));
  if (filters.age) conditions.push(eq(pet.ageGroup, filters.age));
  if (filters.area) conditions.push(eq(pet.buildingId, filters.area));

  const rows = await database
    .select(cardColumns)
    .from(pet)
    .leftJoin(building, eq(building.id, pet.buildingId))
    .where(and(...conditions))
    .orderBy(desc(pet.isFeatured), desc(pet.approvedAt))
    .limit(limit);
  const photos = await photosFor(
    database,
    rows.map((row) => row.id),
  );
  return rows.map((row) => toCard(row, photos));
}

export async function listAdoptedPets(database: Database, limit = 30) {
  const rows = await database
    .select({ ...cardColumns, successStory: pet.successStory, adoptedAt: pet.adoptedAt })
    .from(pet)
    .leftJoin(building, eq(building.id, pet.buildingId))
    .where(and(eq(pet.status, "adopted"), isNotNull(pet.approvedAt), isNull(pet.deletedAt)))
    .orderBy(desc(pet.isFeatured), desc(pet.adoptedAt))
    .limit(limit);
  const photos = await photosFor(
    database,
    rows.map((row) => row.id),
  );
  return rows.map(({ successStory, adoptedAt, ...row }) =>
    Object.assign(toCard(row, photos), { successStory, adoptedAt }),
  );
}

/** Public detail for approved pets that are listed or already adopted. */
export async function findPublicPetBySlug(
  database: Database,
  slug: string,
): Promise<PublicPetDetail | null> {
  const [row] = await database
    .select({
      ...cardColumns,
      temperament: pet.temperament,
      vaccinated: pet.vaccinated,
      sterilized: pet.sterilized,
      dewormed: pet.dewormed,
      healthNotes: pet.healthNotes,
      areaReference: pet.areaReference,
      story: pet.story,
      successStory: pet.successStory,
      adoptedAt: pet.adoptedAt,
    })
    .from(pet)
    .leftJoin(building, eq(building.id, pet.buildingId))
    .where(
      and(
        eq(pet.slug, slug),
        inArray(pet.status, [...publicPetStatuses, "adopted"]),
        isNotNull(pet.approvedAt),
        isNull(pet.deletedAt),
      ),
    )
    .limit(1);
  if (!row) return null;
  const photos = await photosFor(database, [row.id]);
  const gallery = photos.get(row.id) ?? [];
  const { coverMediaId, ...rest } = row;
  return { ...rest, cover: pickCover(gallery, coverMediaId), photos: gallery };
}

export async function listPublicPetSlugs(database: Database) {
  return database
    .select({ slug: pet.slug, updatedAt: pet.updatedAt })
    .from(pet)
    .where(publicFilter)
    .orderBy(desc(pet.updatedAt))
    .limit(5000);
}

/* ------------------------------------------------------------------ */
/* Posting                                                            */
/* ------------------------------------------------------------------ */

async function recordPetEvent(
  tx: Transaction,
  input: {
    petId: string;
    from: PetStatus | null;
    to: PetStatus;
    actorUserId: string | null;
    note: string | null;
  },
) {
  await tx.insert(petStatusEvent).values({
    petId: input.petId,
    fromStatus: input.from,
    toStatus: input.to,
    actorUserId: input.actorUserId,
    note: input.note,
  });
}

export async function createPetRecord(
  database: Database,
  input: CreatePetInput & {
    id: string;
    deviceHash: string;
    ipHash: string;
    mediaIds: string[];
  },
  secret: string,
) {
  const manageToken = randomToken();
  return database.transaction(
    async (tx) => {
      if (input.buildingId) {
        const [area] = await tx
          .select({ id: building.id })
          .from(building)
          .where(and(eq(building.id, input.buildingId), eq(building.isActive, true)))
          .limit(1);
        if (!area) throw new AdoptionError("invalid_building");
      }
      const slug = `${slugify(input.name)}-${input.id.slice(-6)}`;
      const [created] = await tx
        .insert(pet)
        .values({
          id: input.id,
          slug,
          name: input.name,
          species: input.species,
          speciesOther: input.species === "other" ? input.speciesOther : null,
          sex: input.sex,
          ageGroup: input.ageGroup,
          size: input.size,
          temperament: [...new Set(input.temperament)],
          vaccinated: input.vaccinated,
          sterilized: input.sterilized,
          dewormed: input.dewormed,
          healthNotes: input.healthNotes,
          buildingId: input.buildingId,
          areaReference: input.areaReference,
          story: input.story,
          status: "pending_approval",
          posterName: input.posterName,
          posterEmail: input.posterEmail,
          posterPhone: input.posterPhone,
          consentAt: new Date(),
          manageTokenHash: hashManageToken(secret, manageToken),
          deviceHash: input.deviceHash,
          ipHash: input.ipHash,
        })
        .returning({ id: pet.id, slug: pet.slug, name: pet.name });
      if (!created) throw new Error("Pet insertion failed.");

      const attached = await attachMedia(tx, {
        draftId: created.id,
        kind: "pet_gallery",
        ids: input.mediaIds,
        owner: { petId: created.id },
      });
      if (attached[0]) {
        await tx.update(pet).set({ coverMediaId: attached[0].id }).where(eq(pet.id, created.id));
      }
      await recordPetEvent(tx, {
        petId: created.id,
        from: null,
        to: "pending_approval",
        actorUserId: null,
        note: null,
      });
      return { ...created, manageToken };
    },
    { behavior: "immediate" },
  );
}

export async function markPosterEmailVerified(tx: Transaction, petId: string, now: Date) {
  const updated = await tx
    .update(pet)
    .set({ posterEmailVerifiedAt: now })
    .where(and(eq(pet.id, petId), isNull(pet.deletedAt)))
    .returning({ id: pet.id });
  return updated.length > 0;
}

/* ------------------------------------------------------------------ */
/* Staff moderation                                                   */
/* ------------------------------------------------------------------ */

export async function listModerationQueue(database: Database) {
  return database
    .select({
      id: pet.id,
      name: pet.name,
      species: pet.species,
      status: pet.status,
      createdAt: pet.createdAt,
      posterEmailVerifiedAt: pet.posterEmailVerifiedAt,
    })
    .from(pet)
    .where(
      and(
        eq(pet.status, "pending_approval"),
        isNotNull(pet.posterEmailVerifiedAt),
        isNull(pet.deletedAt),
      ),
    )
    .orderBy(asc(pet.createdAt))
    .limit(100);
}

export async function listStaffPets(database: Database, status?: PetStatus) {
  const pendingRequests = sql<number>`(
    select count(*) from ${adoptionRequest}
    where ${adoptionRequest.petId} = ${pet.id}
      and ${adoptionRequest.status} in ('pending', 'in_review')
      and ${adoptionRequest.emailVerifiedAt} is not null
  )`;
  return database
    .select({
      id: pet.id,
      name: pet.name,
      species: pet.species,
      status: pet.status,
      isFeatured: pet.isFeatured,
      updatedAt: pet.updatedAt,
      openRequests: pendingRequests,
    })
    .from(pet)
    .where(
      and(
        isNull(pet.deletedAt),
        status ? eq(pet.status, status) : sql`${pet.status} <> 'pending_approval'`,
      ),
    )
    .orderBy(desc(pet.updatedAt))
    .limit(200);
}

export async function findPetForStaff(database: Database, id: string) {
  const [row] = await database
    .select({
      id: pet.id,
      slug: pet.slug,
      name: pet.name,
      species: pet.species,
      speciesOther: pet.speciesOther,
      sex: pet.sex,
      ageGroup: pet.ageGroup,
      size: pet.size,
      temperament: pet.temperament,
      vaccinated: pet.vaccinated,
      sterilized: pet.sterilized,
      dewormed: pet.dewormed,
      healthNotes: pet.healthNotes,
      areaName: building.name,
      areaReference: pet.areaReference,
      story: pet.story,
      status: pet.status,
      posterName: pet.posterName,
      posterEmail: pet.posterEmail,
      posterPhone: pet.posterPhone,
      posterEmailVerifiedAt: pet.posterEmailVerifiedAt,
      rejectionReason: pet.rejectionReason,
      successStory: pet.successStory,
      isFeatured: pet.isFeatured,
      coverMediaId: pet.coverMediaId,
      approvedAt: pet.approvedAt,
      createdAt: pet.createdAt,
    })
    .from(pet)
    .leftJoin(building, eq(building.id, pet.buildingId))
    .where(and(eq(pet.id, id), isNull(pet.deletedAt)))
    .limit(1);
  if (!row) return null;
  const [photos, requests, events] = await Promise.all([
    photosFor(database, [row.id]),
    listRequestsForPet(database, row.id, { includeUnverified: true }),
    database
      .select({
        id: petStatusEvent.id,
        toStatus: petStatusEvent.toStatus,
        note: petStatusEvent.note,
        actorName: user.name,
        actorUserId: petStatusEvent.actorUserId,
        createdAt: petStatusEvent.createdAt,
      })
      .from(petStatusEvent)
      .leftJoin(user, eq(user.id, petStatusEvent.actorUserId))
      .where(eq(petStatusEvent.petId, row.id))
      .orderBy(asc(petStatusEvent.createdAt), asc(petStatusEvent.id)),
  ]);
  return { ...row, photos: photos.get(row.id) ?? [], requests, events };
}

type StaffActor = { id: string; role: "admin" | "maintenance" | "moderator" };

async function lockPet(tx: Transaction, id: string) {
  const [current] = await tx
    .select({
      id: pet.id,
      slug: pet.slug,
      name: pet.name,
      status: pet.status,
      posterEmail: pet.posterEmail,
      posterEmailVerifiedAt: pet.posterEmailVerifiedAt,
    })
    .from(pet)
    .where(and(eq(pet.id, id), isNull(pet.deletedAt)))
    .limit(1);
  if (!current) throw new AdoptionError("not_found");
  return current;
}

async function audit(
  tx: Transaction,
  actorId: string | null,
  action: string,
  entityType: "pet" | "adoption_request",
  entityId: string,
  metadata?: Record<string, unknown>,
) {
  await tx.insert(auditLog).values({
    actorUserId: actorId,
    action,
    entityType,
    entityId,
    metadata: metadata ?? null,
  });
}

export type PetStatusChange = {
  petId: string;
  slug: string;
  name: string;
  from: PetStatus;
  to: PetStatus;
  note: string | null;
  posterEmail: string | null;
};

async function transitionPet(
  tx: Transaction,
  input: {
    petId: string;
    to: PetStatus;
    note: string | null;
    actor: PetActor;
    actorUserId: string | null;
    patch?: Partial<typeof pet.$inferInsert>;
  },
): Promise<PetStatusChange> {
  const current = await lockPet(tx, input.petId);
  if (!canTransitionPet(current.status, input.to, input.actor)) {
    throw new AdoptionError("invalid_transition");
  }
  const now = new Date();
  const [updated] = await tx
    .update(pet)
    .set({
      status: input.to,
      updatedAt: now,
      ...(input.to === "adopted" ? { adoptedAt: now } : {}),
      ...input.patch,
    })
    .where(and(eq(pet.id, current.id), eq(pet.status, current.status)))
    .returning({ id: pet.id });
  if (!updated) throw new AdoptionError("stale");
  await recordPetEvent(tx, {
    petId: current.id,
    from: current.status,
    to: input.to,
    actorUserId: input.actorUserId,
    note: input.note,
  });
  return {
    petId: current.id,
    slug: current.slug,
    name: current.name,
    from: current.status,
    to: input.to,
    note: input.note,
    posterEmail: current.posterEmailVerifiedAt ? current.posterEmail : null,
  };
}

export async function approvePetRecord(database: Database, petId: string, actor: StaffActor) {
  return database.transaction(
    async (tx) => {
      const change = await transitionPet(tx, {
        petId,
        to: "available",
        note: null,
        actor: { kind: "staff", role: actor.role },
        actorUserId: actor.id,
        patch: { approvedByUserId: actor.id, approvedAt: new Date(), rejectionReason: null },
      });
      await audit(tx, actor.id, "pet.approve", "pet", petId);
      return change;
    },
    { behavior: "immediate" },
  );
}

export async function rejectPetRecord(
  database: Database,
  input: { petId: string; reason: string },
  actor: StaffActor,
) {
  return database.transaction(
    async (tx) => {
      const current = await lockPet(tx, input.petId);
      if (current.status !== "pending_approval") throw new AdoptionError("invalid_transition");
      const change = await transitionPet(tx, {
        petId: input.petId,
        to: "archived",
        note: input.reason,
        actor: { kind: "staff", role: actor.role },
        actorUserId: actor.id,
        patch: { rejectionReason: input.reason },
      });
      await audit(tx, actor.id, "pet.reject", "pet", input.petId);
      return change;
    },
    { behavior: "immediate" },
  );
}

export async function changePetStatusByStaff(
  database: Database,
  input: { petId: string; status: PetStatus; note: string | null },
  actor: StaffActor,
) {
  return database.transaction(
    async (tx) => {
      const current = await lockPet(tx, input.petId);
      if (current.status === "pending_approval") throw new AdoptionError("invalid_transition");
      const change = await transitionPet(tx, {
        petId: input.petId,
        to: input.status,
        note: input.note,
        actor: { kind: "staff", role: actor.role },
        actorUserId: actor.id,
      });
      await audit(tx, actor.id, "pet.change_status", "pet", input.petId, {
        from: change.from,
        to: change.to,
      });
      return change;
    },
    { behavior: "immediate" },
  );
}

export async function updatePetProfile(
  database: Database,
  input: {
    petId: string;
    name: string;
    story: string;
    healthNotes: string | null;
    successStory: string | null;
    isFeatured: boolean;
    coverMediaId: string | null;
  },
  actor: StaffActor,
) {
  await database.transaction(
    async (tx) => {
      const current = await lockPet(tx, input.petId);
      let coverMediaId: string | null = null;
      if (input.coverMediaId) {
        const [photo] = await tx
          .select({ id: media.id })
          .from(media)
          .where(
            and(
              eq(media.id, input.coverMediaId),
              eq(media.petId, current.id),
              eq(media.status, "attached"),
            ),
          )
          .limit(1);
        coverMediaId = photo?.id ?? null;
      }
      await tx
        .update(pet)
        .set({
          name: input.name,
          story: input.story,
          healthNotes: input.healthNotes,
          successStory: input.successStory,
          isFeatured: input.isFeatured,
          coverMediaId,
          updatedAt: new Date(),
        })
        .where(eq(pet.id, current.id));
      await audit(tx, actor.id, "pet.update", "pet", current.id);
    },
    { behavior: "immediate" },
  );
}

export async function attachStaffPetPhotos(
  database: Database,
  input: { petId: string; mediaIds: string[] },
  actor: StaffActor,
) {
  await database.transaction(
    async (tx) => {
      const current = await lockPet(tx, input.petId);
      await attachMedia(tx, {
        draftId: current.id,
        kind: "pet_gallery",
        ids: input.mediaIds,
        owner: { petId: current.id },
      });
      await audit(tx, actor.id, "pet.add_photos", "pet", current.id, {
        count: input.mediaIds.length,
      });
    },
    { behavior: "immediate" },
  );
}

export async function softDeletePetRecord(database: Database, petId: string, actor: StaffActor) {
  await database.transaction(
    async (tx) => {
      const current = await lockPet(tx, petId);
      await tx
        .update(pet)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(pet.id, current.id));
      await audit(tx, actor.id, "pet.soft_delete", "pet", current.id);
    },
    { behavior: "immediate" },
  );
}

/* ------------------------------------------------------------------ */
/* Adoption requests                                                  */
/* ------------------------------------------------------------------ */

export type RequestSummary = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  campusRelationship: CampusRelationship;
  housingType: HousingType;
  hasOtherPets: boolean;
  hasExperience: boolean;
  motivation: string;
  status: RequestStatus;
  emailVerifiedAt: Date | null;
  staffNotes: string | null;
  createdAt: Date;
};

export async function listRequestsForPet(
  database: Database,
  petId: string,
  options: { includeUnverified: boolean },
): Promise<RequestSummary[]> {
  return database
    .select({
      id: adoptionRequest.id,
      fullName: adoptionRequest.fullName,
      email: adoptionRequest.email,
      phone: adoptionRequest.phone,
      campusRelationship: adoptionRequest.campusRelationship,
      housingType: adoptionRequest.housingType,
      hasOtherPets: adoptionRequest.hasOtherPets,
      hasExperience: adoptionRequest.hasExperience,
      motivation: adoptionRequest.motivation,
      status: adoptionRequest.status,
      emailVerifiedAt: adoptionRequest.emailVerifiedAt,
      staffNotes: adoptionRequest.staffNotes,
      createdAt: adoptionRequest.createdAt,
    })
    .from(adoptionRequest)
    .where(
      and(
        eq(adoptionRequest.petId, petId),
        options.includeUnverified ? undefined : isNotNull(adoptionRequest.emailVerifiedAt),
      ),
    )
    .orderBy(desc(adoptionRequest.createdAt));
}

export async function listOpenRequests(database: Database) {
  return database
    .select({
      id: adoptionRequest.id,
      petId: pet.id,
      petName: pet.name,
      fullName: adoptionRequest.fullName,
      status: adoptionRequest.status,
      createdAt: adoptionRequest.createdAt,
    })
    .from(adoptionRequest)
    .innerJoin(pet, eq(pet.id, adoptionRequest.petId))
    .where(
      and(
        inArray(adoptionRequest.status, ["pending", "in_review"]),
        isNotNull(adoptionRequest.emailVerifiedAt),
        isNull(pet.deletedAt),
      ),
    )
    .orderBy(asc(adoptionRequest.createdAt))
    .limit(200);
}

export async function createAdoptionRequestRecord(
  database: Database,
  input: CreateRequestInput & { petId: string; deviceHash: string; ipHash: string },
) {
  return database.transaction(
    async (tx) => {
      const [target] = await tx
        .select({ id: pet.id, name: pet.name, status: pet.status })
        .from(pet)
        .where(and(eq(pet.id, input.petId), publicFilter))
        .limit(1);
      if (!target) throw new AdoptionError("not_available");

      const [active] = await tx
        .select({ total: count() })
        .from(adoptionRequest)
        .where(
          and(
            eq(adoptionRequest.petId, target.id),
            sql`lower(${adoptionRequest.email}) = ${input.email}`,
            inArray(adoptionRequest.status, ["pending", "in_review", "accepted"]),
          ),
        );
      if ((active?.total ?? 0) > 0) throw new AdoptionError("duplicate_request");

      const [created] = await tx
        .insert(adoptionRequest)
        .values({
          petId: target.id,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          campusRelationship: input.campusRelationship,
          housingType: input.housingType,
          hasOtherPets: input.hasOtherPets,
          hasExperience: input.hasExperience,
          motivation: input.motivation,
          consentAt: new Date(),
          deviceHash: input.deviceHash,
          ipHash: input.ipHash,
        })
        .returning({ id: adoptionRequest.id });
      if (!created) throw new Error("Request insertion failed.");
      return { id: created.id, petName: target.name };
    },
    { behavior: "immediate" },
  );
}

export async function markRequestEmailVerified(tx: Transaction, requestId: string, now: Date) {
  const updated = await tx
    .update(adoptionRequest)
    .set({ emailVerifiedAt: now, updatedAt: now })
    .where(and(eq(adoptionRequest.id, requestId), eq(adoptionRequest.status, "pending")))
    .returning({ id: adoptionRequest.id });
  return updated.length > 0;
}

export async function findRequestNotificationTargets(database: Database, requestId: string) {
  const [row] = await database
    .select({
      petName: pet.name,
      posterEmail: pet.posterEmail,
      posterEmailVerifiedAt: pet.posterEmailVerifiedAt,
    })
    .from(adoptionRequest)
    .innerJoin(pet, eq(pet.id, adoptionRequest.petId))
    .where(eq(adoptionRequest.id, requestId))
    .limit(1);
  const moderators = await database
    .select({ email: user.email })
    .from(user)
    .where(and(inArray(user.role, ["admin", "moderator"]), sql`coalesce(${user.banned}, 0) = 0`));
  return {
    petName: row?.petName ?? null,
    posterEmail: row?.posterEmailVerifiedAt ? row.posterEmail : null,
    moderatorEmails: moderators.map((entry) => entry.email),
  };
}

const closedRequestStatuses = new Set<RequestStatus>(["declined", "withdrawn"]);

export async function updateRequestStatusRecord(
  database: Database,
  input: {
    requestId: string;
    status: RequestStatus;
    staffNotes?: string | null;
    petId?: string;
  },
  actor: { userId: string | null },
) {
  await database.transaction(
    async (tx) => {
      const [current] = await tx
        .select({ id: adoptionRequest.id, petId: adoptionRequest.petId })
        .from(adoptionRequest)
        .where(
          and(
            eq(adoptionRequest.id, input.requestId),
            input.petId ? eq(adoptionRequest.petId, input.petId) : undefined,
            isNotNull(adoptionRequest.emailVerifiedAt),
          ),
        )
        .limit(1);
      if (!current) throw new AdoptionError("not_found");
      const now = new Date();
      await tx
        .update(adoptionRequest)
        .set({
          status: input.status,
          updatedAt: now,
          closedAt: closedRequestStatuses.has(input.status) ? now : null,
          ...(actor.userId ? { handledByUserId: actor.userId } : {}),
          ...(input.staffNotes === undefined ? {} : { staffNotes: input.staffNotes }),
        })
        .where(eq(adoptionRequest.id, current.id));
      await audit(tx, actor.userId, "adoption_request.update", "adoption_request", current.id, {
        status: input.status,
      });
    },
    { behavior: "immediate" },
  );
}

/* ------------------------------------------------------------------ */
/* Poster management through the capability link                      */
/* ------------------------------------------------------------------ */

export async function findPetByManageTokenHash(database: Database, tokenHash: string) {
  const [row] = await database
    .select({
      id: pet.id,
      slug: pet.slug,
      name: pet.name,
      status: pet.status,
      approvedAt: pet.approvedAt,
      rejectionReason: pet.rejectionReason,
      successStory: pet.successStory,
      posterEmailVerifiedAt: pet.posterEmailVerifiedAt,
    })
    .from(pet)
    .where(and(eq(pet.manageTokenHash, tokenHash), isNull(pet.deletedAt)))
    .limit(1);
  if (!row) return null;
  const requests = await listRequestsForPet(database, row.id, { includeUnverified: false });
  return { ...row, requests };
}

export async function posterChangeStatus(
  database: Database,
  input: { petId: string; status: PetStatus; successStory?: string | null },
) {
  return database.transaction(
    async (tx) => {
      const change = await transitionPet(tx, {
        petId: input.petId,
        to: input.status,
        note: null,
        actor: { kind: "poster" },
        actorUserId: null,
        ...(input.successStory ? { patch: { successStory: input.successStory } } : {}),
      });
      await audit(tx, null, "pet.poster_status", "pet", input.petId, { to: input.status });
      return change;
    },
    { behavior: "immediate" },
  );
}

export async function posterSaveStory(
  database: Database,
  input: { petId: string; successStory: string },
) {
  await database
    .update(pet)
    .set({ successStory: input.successStory, updatedAt: new Date() })
    .where(and(eq(pet.id, input.petId), eq(pet.status, "adopted"), isNull(pet.deletedAt)));
}

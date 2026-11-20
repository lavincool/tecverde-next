import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";

import { listActiveCatalog } from "@/features/reports/repository";
import { requireStaff } from "@/server/auth/guards";
import { hasStaffPermission } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { readHashSecret } from "@/server/security/device";
import { isStorageConfigured } from "@/server/storage/r2";

import { PETS_TAG } from "./cache-tags";
import {
  findPetByManageTokenHash,
  findPetForStaff,
  findPublicPetBySlug,
  hashManageToken,
  listAdoptedPets,
  listModerationQueue,
  listOpenRequests,
  listPublicPets,
  listPublicPetSlugs,
  listStaffPets,
} from "./repository";
import { galleryFiltersSchema, manageTokenSchema, petSlugSchema } from "./schema";
import { nextPetStatuses } from "./status-machine";

import type { GalleryFilters } from "./schema";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseGalleryFilters(
  searchParams: Record<string, string | string[] | undefined>,
): GalleryFilters {
  return galleryFiltersSchema.parse({
    species: first(searchParams.species),
    sex: first(searchParams.sex),
    size: first(searchParams.size),
    age: first(searchParams.age),
    area: first(searchParams.area),
  });
}

export async function getGallery(filters: GalleryFilters) {
  "use cache";
  cacheTag(PETS_TAG);
  cacheLife("hours");
  return listPublicPets(db, filters);
}

export async function getAdoptedStories(limit?: number) {
  "use cache";
  cacheTag(PETS_TAG);
  cacheLife("hours");
  return listAdoptedPets(db, limit);
}

export async function getPublicPet(slug: string) {
  "use cache";
  cacheTag(PETS_TAG);
  cacheLife("hours");
  if (!petSlugSchema.safeParse(slug).success) return null;
  return findPublicPetBySlug(db, slug);
}

export async function getPublicPetSlugs() {
  "use cache";
  cacheTag(PETS_TAG);
  cacheLife("hours");
  return listPublicPetSlugs(db);
}

export async function getCampusAreas() {
  "use cache";
  cacheLife("days");
  const { buildings } = await listActiveCatalog(db);
  return buildings;
}

export async function getManagedPet(token: string) {
  await connection();
  const secret = readHashSecret();
  if (!secret || !manageTokenSchema.safeParse(token).success) return null;
  const record = await findPetByManageTokenHash(db, hashManageToken(secret, token));
  if (!record) return null;
  return { ...record, transitions: nextPetStatuses(record.status, { kind: "poster" }) };
}

export async function getModerationOverview() {
  await requireStaff({ pet: ["moderate"] });
  const [queue, pets] = await Promise.all([listModerationQueue(db), listStaffPets(db)]);
  return { queue, pets };
}

export async function getStaffPet(id: string) {
  const staff = await requireStaff({ pet: ["moderate"] });
  if (!/^[\da-f-]{36}$/i.test(id)) return null;
  const record = await findPetForStaff(db, id);
  if (!record) return null;
  const canArchive = hasStaffPermission(staff.role, { pet: ["archive"] });
  return {
    pet: record,
    transitions: nextPetStatuses(record.status, { kind: "staff", role: staff.role }).filter(
      (status) => canArchive || status !== "archived",
    ),
    uploadsEnabled: isStorageConfigured(),
    can: {
      delete: hasStaffPermission(staff.role, { pet: ["delete"] }),
      archive: hasStaffPermission(staff.role, { pet: ["archive"] }),
      requests: hasStaffPermission(staff.role, { adoption_request: ["update"] }),
    },
  };
}

export async function getOpenRequests() {
  await requireStaff({ adoption_request: ["read"] });
  return listOpenRequests(db);
}

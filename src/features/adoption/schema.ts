import { z } from "zod";

import {
  ageGroups,
  campusRelationships,
  healthStates,
  housingTypes,
  requestStatuses,
  sexes,
  sizes,
  species,
  temperaments,
} from "./enums";

export const PET_NAME_MAX_LENGTH = 40;
export const PET_STORY_MAX_LENGTH = 800;
export const PET_NOTES_MAX_LENGTH = 300;
export const PET_AREA_MAX_LENGTH = 120;
export const CONTACT_NAME_MAX_LENGTH = 100;
export const PHONE_MAX_LENGTH = 20;
export const MOTIVATION_MAX_LENGTH = 800;
export const REASON_MAX_LENGTH = 300;

const optionalText = (max: number) =>
  z
    .string()
    .default("")
    .pipe(
      z
        .string()
        .trim()
        .max(max)
        .transform((value) => (value.length > 0 ? value : null)),
    );

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));

const phone = z
  .string()
  .default("")
  .pipe(
    z
      .string()
      .trim()
      .regex(/^[\d\s()+-]{0,20}$/)
      .transform((value) => (value.length > 0 ? value : null)),
  );

const consent = z.literal("on");

export const petFieldNames = [
  "name",
  "species",
  "speciesOther",
  "sex",
  "ageGroup",
  "size",
  "temperament",
  "vaccinated",
  "sterilized",
  "dewormed",
  "healthNotes",
  "buildingId",
  "areaReference",
  "story",
  "posterName",
  "posterEmail",
  "posterPhone",
  "consent",
] as const;
export type PetFieldName = (typeof petFieldNames)[number];

export const createPetInputSchema = z
  .object({
    name: z.string().trim().min(1).max(PET_NAME_MAX_LENGTH),
    species: z.enum(species),
    speciesOther: optionalText(40),
    sex: z.enum(sexes),
    ageGroup: z.enum(ageGroups),
    size: z.enum(sizes),
    temperament: z.array(z.enum(temperaments)).max(temperaments.length).default([]),
    vaccinated: z.enum(healthStates),
    sterilized: z.enum(healthStates),
    dewormed: z.enum(healthStates),
    healthNotes: optionalText(PET_NOTES_MAX_LENGTH),
    buildingId: z
      .string()
      .default("")
      .transform((value) => (value.length > 0 ? value : null))
      .pipe(z.uuidv7().nullable()),
    areaReference: optionalText(PET_AREA_MAX_LENGTH),
    story: z.string().trim().min(20).max(PET_STORY_MAX_LENGTH),
    posterName: z.string().trim().min(1).max(CONTACT_NAME_MAX_LENGTH),
    posterEmail: email,
    posterPhone: phone,
    consent,
  })
  .refine((value) => value.species !== "other" || value.speciesOther !== null, {
    path: ["speciesOther"],
  });

export type CreatePetInput = z.output<typeof createPetInputSchema>;

export const requestFieldNames = [
  "fullName",
  "email",
  "phone",
  "campusRelationship",
  "housingType",
  "hasOtherPets",
  "hasExperience",
  "motivation",
  "consent",
] as const;
export type RequestFieldName = (typeof requestFieldNames)[number];

const yesNo = z.enum(["yes", "no"]).transform((value) => value === "yes");

export const createRequestInputSchema = z.object({
  fullName: z.string().trim().min(1).max(CONTACT_NAME_MAX_LENGTH),
  email,
  phone,
  campusRelationship: z.enum(campusRelationships),
  housingType: z.enum(housingTypes),
  hasOtherPets: yesNo,
  hasExperience: yesNo,
  motivation: z.string().trim().min(20).max(MOTIVATION_MAX_LENGTH),
  consent,
});

export type CreateRequestInput = z.output<typeof createRequestInputSchema>;

export const petSlugSchema = z.string().regex(/^[a-z\d-]{3,80}$/);
export const manageTokenSchema = z.string().regex(/^[\w-]{43}$/);
export const requestStatusSchema = z.enum(requestStatuses);

export const galleryFiltersSchema = z.object({
  species: z.enum(species).optional().catch(undefined),
  sex: z.enum(sexes).optional().catch(undefined),
  size: z.enum(sizes).optional().catch(undefined),
  age: z.enum(ageGroups).optional().catch(undefined),
  area: z.uuidv7().optional().catch(undefined),
});
export type GalleryFilters = z.output<typeof galleryFiltersSchema>;

export function slugify(name: string) {
  return (
    name
      .normalize("NFD")
      .replaceAll(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replaceAll(/[^a-z\d]+/g, "-")
      .replaceAll(/^-+|-+$/g, "")
      .slice(0, 40) || "animal"
  );
}

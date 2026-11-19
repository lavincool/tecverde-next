import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import {
  ageGroups,
  campusRelationships,
  healthStates,
  housingTypes,
  petStatuses,
  requestStatuses,
  sexes,
  sizes,
  species,
} from "@/features/adoption/enums";

import { user } from "./auth";
import { building } from "./catalog";
import { createdAt, id, oneOf, timestamp, updatedAt } from "./columns";

import type { Temperament } from "@/features/adoption/enums";

export const pet = sqliteTable(
  "pet",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    species: text("species", { enum: species }).notNull(),
    speciesOther: text("species_other"),
    sex: text("sex", { enum: sexes }).notNull(),
    ageGroup: text("age_group", { enum: ageGroups }).notNull(),
    size: text("size", { enum: sizes }).notNull(),
    temperament: text("temperament", { mode: "json" }).$type<Temperament[]>().notNull(),
    vaccinated: text("vaccinated", { enum: healthStates }).notNull().default("unknown"),
    sterilized: text("sterilized", { enum: healthStates }).notNull().default("unknown"),
    dewormed: text("dewormed", { enum: healthStates }).notNull().default("unknown"),
    healthNotes: text("health_notes"),
    buildingId: text("building_id").references(() => building.id, { onDelete: "set null" }),
    areaReference: text("area_reference"),
    story: text("story").notNull(),
    status: text("status", { enum: petStatuses }).notNull().default("pending_approval"),
    posterName: text("poster_name"),
    posterEmail: text("poster_email"),
    posterPhone: text("poster_phone"),
    posterEmailVerifiedAt: timestamp("poster_email_verified_at"),
    consentAt: timestamp("consent_at").notNull(),
    manageTokenHash: text("manage_token_hash").notNull().unique(),
    deviceHash: text("device_hash").notNull(),
    ipHash: text("ip_hash").notNull(),
    approvedByUserId: text("approved_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at"),
    rejectionReason: text("rejection_reason"),
    adoptedAt: timestamp("adopted_at"),
    successStory: text("success_story"),
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    coverMediaId: text("cover_media_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    check("pet_species", oneOf(table.species, species)),
    check("pet_sex", oneOf(table.sex, sexes)),
    check("pet_age_group", oneOf(table.ageGroup, ageGroups)),
    check("pet_size", oneOf(table.size, sizes)),
    check("pet_vaccinated", oneOf(table.vaccinated, healthStates)),
    check("pet_sterilized", oneOf(table.sterilized, healthStates)),
    check("pet_dewormed", oneOf(table.dewormed, healthStates)),
    check("pet_status", oneOf(table.status, petStatuses)),
    index("pet_status_created").on(table.status, table.createdAt),
    index("pet_species_status").on(table.species, table.status),
  ],
);

export const petStatusEvent = sqliteTable(
  "pet_status_event",
  {
    id: id(),
    petId: text("pet_id")
      .notNull()
      .references(() => pet.id, { onDelete: "cascade" }),
    fromStatus: text("from_status", { enum: petStatuses }),
    toStatus: text("to_status", { enum: petStatuses }).notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (table) => [
    check("pet_event_from_status", oneOf(table.fromStatus, petStatuses)),
    check("pet_event_to_status", oneOf(table.toStatus, petStatuses)),
    index("pet_event_pet_created").on(table.petId, table.createdAt),
  ],
);

export const adoptionRequest = sqliteTable(
  "adoption_request",
  {
    id: id(),
    petId: text("pet_id")
      .notNull()
      .references(() => pet.id, { onDelete: "cascade" }),
    fullName: text("full_name"),
    email: text("email"),
    phone: text("phone"),
    campusRelationship: text("campus_relationship", { enum: campusRelationships }).notNull(),
    housingType: text("housing_type", { enum: housingTypes }).notNull(),
    hasOtherPets: integer("has_other_pets", { mode: "boolean" }).notNull(),
    hasExperience: integer("has_experience", { mode: "boolean" }).notNull(),
    motivation: text("motivation").notNull(),
    consentAt: timestamp("consent_at").notNull(),
    status: text("status", { enum: requestStatuses }).notNull().default("pending"),
    emailVerifiedAt: timestamp("email_verified_at"),
    deviceHash: text("device_hash").notNull(),
    ipHash: text("ip_hash").notNull(),
    handledByUserId: text("handled_by_user_id").references(() => user.id, { onDelete: "set null" }),
    staffNotes: text("staff_notes"),
    closedAt: timestamp("closed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("adoption_request_status", oneOf(table.status, requestStatuses)),
    check("adoption_request_relationship", oneOf(table.campusRelationship, campusRelationships)),
    check("adoption_request_housing", oneOf(table.housingType, housingTypes)),
    check("adoption_request_motivation_length", sql`length(${table.motivation}) between 1 and 800`),
    index("adoption_request_pet_status").on(table.petId, table.status),
    uniqueIndex("adoption_request_active_email")
      .on(table.petId, sql`lower(${table.email})`)
      .where(sql`${table.status} in ('pending', 'in_review', 'accepted')`),
  ],
);

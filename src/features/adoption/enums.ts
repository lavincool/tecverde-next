export const petStatuses = [
  "pending_approval",
  "available",
  "in_process",
  "adopted",
  "archived",
] as const;
export const species = ["dog", "cat", "other"] as const;
export const sexes = ["male", "female", "unknown"] as const;
export const ageGroups = ["puppy", "young", "adult", "senior"] as const;
export const sizes = ["small", "medium", "large"] as const;
export const healthStates = ["yes", "no", "unknown"] as const;
export const requestStatuses = [
  "pending",
  "in_review",
  "accepted",
  "declined",
  "withdrawn",
] as const;
export const campusRelationships = ["student", "teacher", "staff", "external"] as const;
export const housingTypes = ["house", "apartment", "other"] as const;
export const temperaments = ["calm", "playful", "shy", "sociable", "active"] as const;

export type PetStatus = (typeof petStatuses)[number];
export type Species = (typeof species)[number];
export type Sex = (typeof sexes)[number];
export type AgeGroup = (typeof ageGroups)[number];
export type Size = (typeof sizes)[number];
export type HealthState = (typeof healthStates)[number];
export type RequestStatus = (typeof requestStatuses)[number];
export type CampusRelationship = (typeof campusRelationships)[number];
export type HousingType = (typeof housingTypes)[number];
export type Temperament = (typeof temperaments)[number];

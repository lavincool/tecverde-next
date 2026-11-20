import type { PetStatus } from "./enums";
import type { StaffRole } from "@/features/staff/enums";

const moderatorTransitions = {
  pending_approval: ["available", "archived"],
  available: ["in_process", "archived"],
  in_process: ["available", "adopted", "archived"],
  adopted: ["archived"],
  archived: [],
} as const satisfies Record<PetStatus, readonly PetStatus[]>;

const posterTransitions = {
  pending_approval: [],
  available: ["in_process", "archived"],
  in_process: ["available", "adopted", "archived"],
  adopted: [],
  archived: [],
} as const satisfies Record<PetStatus, readonly PetStatus[]>;

export type PetActor = { kind: "staff"; role: StaffRole } | { kind: "poster" };

export function nextPetStatuses(from: PetStatus, actor: PetActor): PetStatus[] {
  if (actor.kind === "poster") return [...posterTransitions[from]];
  const base: readonly PetStatus[] = moderatorTransitions[from];
  return actor.role === "admin" && from === "archived" ? [...base, "available"] : [...base];
}

export function canTransitionPet(from: PetStatus, to: PetStatus, actor: PetActor) {
  return nextPetStatuses(from, actor).includes(to);
}

export const publicPetStatuses = [
  "available",
  "in_process",
] as const satisfies readonly PetStatus[];

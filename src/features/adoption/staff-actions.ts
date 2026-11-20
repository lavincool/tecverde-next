"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { verifiedDraftMedia } from "@/features/media/uploads";
import { notifyModerationResult } from "@/features/notifications/adoption-updates";
import { formText } from "@/lib/form-text";
import { adoption } from "@/messages/es-MX/adoption";
import { dashboard } from "@/messages/es-MX/dashboard";
import { requireStaff, StaffAccessError } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getAppOrigin } from "@/server/security/device";

import { PETS_TAG } from "./cache-tags";
import { petStatuses } from "./enums";
import {
  AdoptionError,
  approvePetRecord,
  attachStaffPetPhotos,
  changePetStatusByStaff,
  rejectPetRecord,
  softDeletePetRecord,
  updatePetProfile,
  updateRequestStatusRecord,
} from "./repository";
import {
  PET_NAME_MAX_LENGTH,
  PET_NOTES_MAX_LENGTH,
  PET_STORY_MAX_LENGTH,
  REASON_MAX_LENGTH,
  requestStatusSchema,
} from "./schema";

import type { StaffPermission } from "@/server/auth/permissions";

export type ModerationState = { ok?: true; error?: string };

const copy = adoption.staff;
const petId = z.uuidv7();
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : null));

function failure(error: unknown): ModerationState {
  if (error instanceof StaffAccessError) {
    return {
      error: error.status === 401 ? dashboard.staff.signInAgain : dashboard.staff.forbidden,
    };
  }
  if (error instanceof AdoptionError) {
    const reason = error.reason;
    if (reason === "not_found" || reason === "invalid_transition" || reason === "stale") {
      return { error: copy.failures[reason] };
    }
  }
  return { error: dashboard.login.unavailable };
}

function refresh(id: string, slug?: string) {
  updateTag(PETS_TAG);
  revalidatePath("/dashboard/adoption");
  revalidatePath(`/dashboard/adoption/${id}`);
  revalidatePath("/adopt");
  revalidatePath("/adopt/adopted");
  if (slug) revalidatePath(`/adopt/${slug}`);
}

async function run(
  permission: StaffPermission,
  task: (staff: Awaited<ReturnType<typeof requireStaff>>) => Promise<{ id: string; slug?: string }>,
): Promise<ModerationState> {
  try {
    const staff = await requireStaff(permission);
    const result = await task(staff);
    refresh(result.id, result.slug);
    return { ok: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: copy.failures.invalid };
    return failure(error);
  }
}

export async function approvePet(_: ModerationState, form: FormData) {
  return run({ pet: ["moderate"] }, async (staff) => {
    const id = petId.parse(formText(form, "petId"));
    const change = await approvePetRecord(db, id, staff);
    const origin = await getAppOrigin();
    after(() => notifyModerationResult(change, "approved", origin));
    return { id, slug: change.slug };
  });
}

export async function rejectPet(_: ModerationState, form: FormData) {
  return run({ pet: ["moderate"] }, async (staff) => {
    const id = petId.parse(formText(form, "petId"));
    const reason = z.string().trim().min(1).max(REASON_MAX_LENGTH).parse(formText(form, "reason"));
    const change = await rejectPetRecord(db, { petId: id, reason }, staff);
    const origin = await getAppOrigin();
    after(() => notifyModerationResult(change, "rejected", origin));
    return { id };
  });
}

export async function updatePetStatus(_: ModerationState, form: FormData) {
  return run({ pet: ["update"] }, async (staff) => {
    const id = petId.parse(formText(form, "petId"));
    const status = z.enum(petStatuses).parse(formText(form, "status"));
    const note = optional(REASON_MAX_LENGTH).parse(formText(form, "note"));
    if (status === "archived") await requireStaff({ pet: ["archive"] });
    const change = await changePetStatusByStaff(db, { petId: id, status, note }, staff);
    return { id, slug: change.slug };
  });
}

export async function updatePet(_: ModerationState, form: FormData) {
  return run({ pet: ["update"] }, async (staff) => {
    const id = petId.parse(formText(form, "petId"));
    await updatePetProfile(
      db,
      {
        petId: id,
        name: z.string().trim().min(1).max(PET_NAME_MAX_LENGTH).parse(formText(form, "name")),
        story: z.string().trim().min(1).max(PET_STORY_MAX_LENGTH).parse(formText(form, "story")),
        healthNotes: optional(PET_NOTES_MAX_LENGTH).parse(formText(form, "healthNotes")),
        successStory: optional(PET_STORY_MAX_LENGTH).parse(formText(form, "successStory")),
        isFeatured: form.get("isFeatured") === "on",
        coverMediaId: z
          .string()
          .transform((value) => (value.length > 0 ? value : null))
          .parse(formText(form, "coverMediaId")),
      },
      staff,
    );
    return { id };
  });
}

export async function addPetPhotos(_: ModerationState, form: FormData) {
  return run({ pet: ["update"] }, async (staff) => {
    const id = petId.parse(formText(form, "petId"));
    const mediaIds = await verifiedDraftMedia({
      draftId: id,
      kind: "pet_gallery",
      ids: form.getAll("mediaIds").filter((value) => typeof value === "string"),
    });
    await attachStaffPetPhotos(db, { petId: id, mediaIds }, staff);
    return { id };
  });
}

export async function updateAdoptionRequest(_: ModerationState, form: FormData) {
  const result = await run({ adoption_request: ["update"] }, async (staff) => {
    const id = petId.parse(formText(form, "petId"));
    await updateRequestStatusRecord(
      db,
      {
        requestId: z.uuidv7().parse(formText(form, "requestId")),
        status: requestStatusSchema.parse(formText(form, "status")),
        staffNotes: optional(REASON_MAX_LENGTH).parse(formText(form, "staffNotes")),
        petId: id,
      },
      { userId: staff.id },
    );
    return { id };
  });
  revalidatePath("/dashboard/adoption/requests");
  return result;
}

export async function deletePet(_: ModerationState, form: FormData) {
  const result = await run({ pet: ["delete"] }, async (staff) => {
    const id = petId.parse(formText(form, "petId"));
    await softDeletePetRecord(db, id, staff);
    return { id };
  });
  if (result.ok) redirect("/dashboard/adoption");
  return result;
}

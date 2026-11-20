"use server";

import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { consumeDraftForDevice, DraftError, readDraftForDevice } from "@/features/media/drafts";
import { verifiedDraftMedia } from "@/features/media/uploads";
import {
  sendPetPostConfirmation,
  sendRequestConfirmation,
} from "@/features/notifications/adoption-updates";
import { formText } from "@/lib/form-text";
import { adoption } from "@/messages/es-MX/adoption";
import { errors } from "@/messages/es-MX/errors";
import { db } from "@/server/db";
import { getAppOrigin, getRequestIpHash, requireHashSecret } from "@/server/security/device";
import { getRateLimiter } from "@/server/security/rate-limit";
import { publicSubmissionsEnabled } from "@/server/security/submissions";

import { PETS_TAG } from "./cache-tags";
import { petStatuses } from "./enums";
import {
  AdoptionError,
  createAdoptionRequestRecord,
  createPetRecord,
  findPetByManageTokenHash,
  hashManageToken,
  posterChangeStatus,
  posterSaveStory,
  updateRequestStatusRecord,
} from "./repository";
import {
  createPetInputSchema,
  createRequestInputSchema,
  manageTokenSchema,
  PET_STORY_MAX_LENGTH,
  petFieldNames,
  requestFieldNames,
  requestStatusSchema,
} from "./schema";

import type { PetFieldName, RequestFieldName } from "./schema";

const DAY_SECONDS = 24 * 60 * 60;

type FieldErrors<Name extends string> = Partial<Record<Name, true>>;

export type CreatePetState = {
  ok?: true;
  error?: string;
  draftExpired?: true;
  fieldErrors?: FieldErrors<PetFieldName>;
  manageUrl?: string;
};

function collectErrors<Name extends string>(
  issues: readonly { path: readonly PropertyKey[] }[],
  names: readonly Name[],
): FieldErrors<Name> {
  const result: FieldErrors<Name> = {};
  for (const issue of issues) {
    const field = names.find((name) => name === issue.path[0]);
    if (field) result[field] = true;
  }
  return result;
}

async function underLimit(key: string, limit: number) {
  const result = await getRateLimiter().consume(key, limit, DAY_SECONDS);
  return result.allowed;
}

export async function createPet(_: CreatePetState, form: FormData): Promise<CreatePetState> {
  if (!publicSubmissionsEnabled()) return { error: errors.submissions.disabled };
  const parsed = createPetInputSchema.safeParse({
    name: formText(form, "name"),
    species: formText(form, "species"),
    speciesOther: formText(form, "speciesOther"),
    sex: formText(form, "sex"),
    ageGroup: formText(form, "ageGroup"),
    size: formText(form, "size"),
    temperament: form.getAll("temperament"),
    vaccinated: formText(form, "vaccinated"),
    sterilized: formText(form, "sterilized"),
    dewormed: formText(form, "dewormed"),
    healthNotes: formText(form, "healthNotes"),
    buildingId: formText(form, "buildingId"),
    areaReference: formText(form, "areaReference"),
    story: formText(form, "story"),
    posterName: formText(form, "posterName"),
    posterEmail: formText(form, "posterEmail"),
    posterPhone: formText(form, "posterPhone"),
    consent: formText(form, "consent"),
  });
  if (!parsed.success) {
    return {
      error: adoption.post.invalid,
      fieldErrors: collectErrors(parsed.error.issues, petFieldNames),
    };
  }

  const draftToken = formText(form, "draftToken");
  try {
    const secret = requireHashSecret();
    const draft = await readDraftForDevice("pet", draftToken);
    const ipHash = await getRequestIpHash();
    const allowed =
      (await underLimit(`tecverde:pet:device:${draft.deviceHash}`, 3)) &&
      (await underLimit(`tecverde:pet:ip:${ipHash}`, 10));
    if (!allowed) return { error: adoption.post.failures.rate_limited };
    await consumeDraftForDevice("pet", draftToken);

    const mediaIds = await verifiedDraftMedia({
      draftId: draft.draftId,
      kind: "pet_gallery",
      ids: form.getAll("mediaIds").filter((value) => typeof value === "string"),
    });
    const created = await createPetRecord(
      db,
      { ...parsed.data, id: draft.draftId, deviceHash: draft.deviceHash, ipHash, mediaIds },
      secret,
    );

    const origin = await getAppOrigin();
    const manageUrl = new URL(`/adopt/manage/${created.manageToken}`, origin).href;
    const email = parsed.data.posterEmail;
    after(() =>
      sendPetPostConfirmation({
        petId: created.id,
        name: created.name,
        email,
        manageUrl,
        origin,
      }),
    );
    return { ok: true, manageUrl };
  } catch (error) {
    if (error instanceof DraftError) {
      return { error: errors.submissions[error.reason], draftExpired: true };
    }
    if (error instanceof AdoptionError && error.reason === "invalid_building") {
      return { error: adoption.post.failures.invalid_building, fieldErrors: { buildingId: true } };
    }
    return { error: adoption.post.failures.unavailable };
  }
}

export type CreateRequestState = {
  ok?: true;
  error?: string;
  draftExpired?: true;
  fieldErrors?: FieldErrors<RequestFieldName>;
};

export async function createAdoptionRequest(
  petId: string,
  _: CreateRequestState,
  form: FormData,
): Promise<CreateRequestState> {
  if (!publicSubmissionsEnabled()) return { error: errors.submissions.disabled };
  const parsedPet = z.uuidv7().safeParse(petId);
  if (!parsedPet.success) return { error: adoption.request.failures.not_available };
  const parsed = createRequestInputSchema.safeParse({
    fullName: formText(form, "fullName"),
    email: formText(form, "email"),
    phone: formText(form, "phone"),
    campusRelationship: formText(form, "campusRelationship"),
    housingType: formText(form, "housingType"),
    hasOtherPets: formText(form, "hasOtherPets"),
    hasExperience: formText(form, "hasExperience"),
    motivation: formText(form, "motivation"),
    consent: formText(form, "consent"),
  });
  if (!parsed.success) {
    return {
      error: adoption.request.invalid,
      fieldErrors: collectErrors(parsed.error.issues, requestFieldNames),
    };
  }

  const draftToken = formText(form, "draftToken");
  try {
    const draft = await readDraftForDevice("request", draftToken);
    const ipHash = await getRequestIpHash();
    const allowed =
      (await underLimit(`tecverde:request:device:${draft.deviceHash}`, 5)) &&
      (await underLimit(`tecverde:request:ip:${ipHash}`, 20));
    if (!allowed) return { error: adoption.request.failures.rate_limited };
    await consumeDraftForDevice("request", draftToken);

    const created = await createAdoptionRequestRecord(db, {
      ...parsed.data,
      petId: parsedPet.data,
      deviceHash: draft.deviceHash,
      ipHash,
    });
    const origin = await getAppOrigin();
    const email = parsed.data.email;
    after(() =>
      sendRequestConfirmation({
        requestId: created.id,
        petName: created.petName,
        email,
        origin,
      }),
    );
    return { ok: true };
  } catch (error) {
    if (error instanceof DraftError) {
      return { error: errors.submissions[error.reason], draftExpired: true };
    }
    if (error instanceof AdoptionError) {
      if (error.reason === "duplicate_request" || error.reason === "not_available") {
        return { error: adoption.request.failures[error.reason] };
      }
    }
    return { error: adoption.request.failures.unavailable };
  }
}

/* Poster management (capability link) */

export type ManageState = { ok?: true; error?: string };

async function petForToken(token: string) {
  if (!manageTokenSchema.safeParse(token).success) return null;
  return findPetByManageTokenHash(db, hashManageToken(requireHashSecret(), token));
}

function manageFailure(error: unknown): ManageState {
  if (error instanceof AdoptionError) {
    const reason = error.reason;
    if (reason === "invalid_transition" || reason === "not_found" || reason === "stale") {
      return { error: adoption.manage.failures[reason] };
    }
  }
  return { error: adoption.manage.failures.unavailable };
}

function refreshPet(slug: string, token: string) {
  updateTag(PETS_TAG);
  revalidatePath(`/adopt/manage/${token}`);
  revalidatePath(`/adopt/${slug}`);
}

export async function posterUpdateStatus(
  token: string,
  _: ManageState,
  form: FormData,
): Promise<ManageState> {
  try {
    const target = await petForToken(token);
    if (!target) return { error: adoption.manage.failures.not_found };
    const status = z.enum(petStatuses).safeParse(formText(form, "status"));
    if (!status.success) return { error: adoption.manage.failures.invalid_transition };
    await posterChangeStatus(db, { petId: target.id, status: status.data });
    refreshPet(target.slug, token);
    return { ok: true };
  } catch (error) {
    return manageFailure(error);
  }
}

export async function posterSubmitStory(
  token: string,
  _: ManageState,
  form: FormData,
): Promise<ManageState> {
  try {
    const target = await petForToken(token);
    if (!target) return { error: adoption.manage.failures.not_found };
    const story = z
      .string()
      .trim()
      .min(1)
      .max(PET_STORY_MAX_LENGTH)
      .safeParse(formText(form, "successStory"));
    if (!story.success) return { error: adoption.manage.failures.unavailable };
    await posterSaveStory(db, { petId: target.id, successStory: story.data });
    refreshPet(target.slug, token);
    return { ok: true };
  } catch (error) {
    return manageFailure(error);
  }
}

export async function posterUpdateRequest(
  token: string,
  _: ManageState,
  form: FormData,
): Promise<ManageState> {
  try {
    const target = await petForToken(token);
    if (!target) return { error: adoption.manage.failures.not_found };
    const requestId = z.uuidv7().safeParse(formText(form, "requestId"));
    const status = requestStatusSchema.safeParse(formText(form, "status"));
    if (!requestId.success || !status.success) {
      return { error: adoption.manage.failures.not_found };
    }
    await updateRequestStatusRecord(
      db,
      { requestId: requestId.data, status: status.data, petId: target.id },
      { userId: null },
    );
    revalidatePath(`/adopt/manage/${token}`);
    return { ok: true };
  } catch (error) {
    return manageFailure(error);
  }
}

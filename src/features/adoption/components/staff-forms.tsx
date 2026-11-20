"use client";

import { useActionState, useMemo, useState } from "react";

import { PhotoPicker } from "@/features/media/components/photo-picker";
import { mediaLimits } from "@/features/media/keys";
import { adoption } from "@/messages/es-MX/adoption";
import { petStatusLabels, requestStatusLabels } from "@/messages/es-MX/enums";
import { media } from "@/messages/es-MX/media";

import { requestStatuses } from "../enums";
import {
  PET_NAME_MAX_LENGTH,
  PET_NOTES_MAX_LENGTH,
  PET_STORY_MAX_LENGTH,
  REASON_MAX_LENGTH,
} from "../schema";
import {
  addPetPhotos,
  approvePet,
  deletePet,
  rejectPet,
  updateAdoptionRequest,
  updatePet,
  updatePetStatus,
} from "../staff-actions";

import type { PetStatus, RequestStatus } from "../enums";
import type { ModerationState } from "../staff-actions";

const copy = adoption.staff;

function Feedback({ state, pending }: { state: ModerationState; pending: boolean }) {
  let message: string | undefined;
  if (pending) message = copy.pending;
  else if (state.error) message = state.error;
  else if (state.ok) message = copy.saved;
  return (
    <output
      aria-live="polite"
      className={state.error ? "report-error text-sm" : "text-sm text-muted"}
    >
      {message}
    </output>
  );
}

function PetIdField({ petId }: { petId: string }) {
  return <input name="petId" type="hidden" value={petId} />;
}

export function ModerationForms({ petId }: { petId: string }) {
  const [approveState, approve, approving] = useActionState(approvePet, {});
  const [rejectState, reject, rejecting] = useActionState(rejectPet, {});
  return (
    <div className="grid gap-4">
      <form action={approve} className="grid gap-2">
        <PetIdField petId={petId} />
        <button
          className="button button--primary justify-self-start"
          disabled={approving}
          type="submit"
        >
          {copy.approve}
        </button>
        <Feedback pending={approving} state={approveState} />
      </form>
      <form action={reject} className="grid gap-3 border-t border-line pt-4">
        <PetIdField petId={petId} />
        <label className="staff-field">
          {copy.rejectReason}
          <textarea
            className="staff-input"
            maxLength={REASON_MAX_LENGTH}
            name="reason"
            required
            rows={2}
          />
        </label>
        <p className="text-sm text-muted">{copy.rejectHint}</p>
        <Feedback pending={rejecting} state={rejectState} />
        <button
          className="button button--danger justify-self-start"
          disabled={rejecting}
          type="submit"
        >
          {copy.reject}
        </button>
      </form>
    </div>
  );
}

export function PetStatusForm({ petId, transitions }: { petId: string; transitions: PetStatus[] }) {
  const [state, action, pending] = useActionState(updatePetStatus, {});
  if (transitions.length === 0)
    return <p className="text-sm text-muted">{adoption.manage.noTransitions}</p>;
  return (
    <form action={action} className="grid gap-3">
      <PetIdField petId={petId} />
      <label className="staff-field">
        {adoption.manage.newStatus}
        <select className="staff-input" defaultValue={transitions[0]} name="status">
          {transitions.map((status) => (
            <option key={status} value={status}>
              {petStatusLabels[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="staff-field">
        {copy.statusNote}
        <textarea className="staff-input" maxLength={REASON_MAX_LENGTH} name="note" rows={2} />
      </label>
      <Feedback pending={pending} state={state} />
      <button
        className="button button--secondary justify-self-start"
        disabled={pending}
        type="submit"
      >
        {adoption.manage.save}
      </button>
    </form>
  );
}

export function PetProfileForm({
  pet,
}: {
  pet: {
    id: string;
    name: string;
    story: string;
    healthNotes: string | null;
    successStory: string | null;
    isFeatured: boolean;
    coverMediaId: string | null;
    photos: { id: string }[];
  };
}) {
  const [state, action, pending] = useActionState(updatePet, {});
  return (
    <form action={action} className="grid gap-3">
      <PetIdField petId={pet.id} />
      <label className="staff-field">
        {copy.name}
        <input
          className="staff-input"
          defaultValue={pet.name}
          maxLength={PET_NAME_MAX_LENGTH}
          name="name"
          required
        />
      </label>
      <label className="staff-field">
        {copy.story}
        <textarea
          className="staff-input"
          defaultValue={pet.story}
          maxLength={PET_STORY_MAX_LENGTH}
          name="story"
          required
          rows={5}
        />
      </label>
      <label className="staff-field">
        {copy.healthNotes}
        <textarea
          className="staff-input"
          defaultValue={pet.healthNotes ?? ""}
          maxLength={PET_NOTES_MAX_LENGTH}
          name="healthNotes"
          rows={2}
        />
      </label>
      <label className="staff-field">
        {copy.successStory}
        <textarea
          className="staff-input"
          defaultValue={pet.successStory ?? ""}
          maxLength={PET_STORY_MAX_LENGTH}
          name="successStory"
          rows={3}
        />
      </label>
      {pet.photos.length > 0 && (
        <label className="staff-field">
          {copy.cover}
          <select className="staff-input" defaultValue={pet.coverMediaId ?? ""} name="coverMediaId">
            <option value="">{copy.noCover}</option>
            {pet.photos.map((photo, index) => (
              <option key={photo.id} value={photo.id}>
                {media.gallery.position(index + 1, pet.photos.length)}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="inline-flex min-h-8 items-center gap-2 text-sm">
        <input defaultChecked={pet.isFeatured} name="isFeatured" type="checkbox" />
        {copy.featured}
      </label>
      <Feedback pending={pending} state={state} />
      <button
        className="button button--primary justify-self-start"
        disabled={pending}
        type="submit"
      >
        {copy.save}
      </button>
    </form>
  );
}

export function AddPetPhotosForm({ petId, remaining }: { petId: string; remaining: number }) {
  const [state, action, pending] = useActionState(addPetPhotos, {});
  const [uploading, setUploading] = useState(false);
  const target = useMemo(() => ({ scope: "pet_staff" as const, petId }), [petId]);
  if (remaining <= 0) return null;
  return (
    <form action={action} className="grid gap-3">
      <PetIdField petId={petId} />
      <PhotoPicker
        max={Math.min(remaining, mediaLimits.pet_gallery)}
        onBusyChange={setUploading}
        target={target}
      />
      <Feedback pending={pending} state={state} />
      <button
        className="button button--secondary justify-self-start"
        disabled={pending || uploading}
        type="submit"
      >
        {copy.savePhotos}
      </button>
    </form>
  );
}

export function StaffRequestForm({
  petId,
  requestId,
  status,
  staffNotes,
}: {
  petId: string;
  requestId: string;
  status: RequestStatus;
  staffNotes: string | null;
}) {
  const [state, action, pending] = useActionState(updateAdoptionRequest, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-end">
      <PetIdField petId={petId} />
      <input name="requestId" type="hidden" value={requestId} />
      <label className="staff-field">
        {adoption.manage.requestStatus}
        <select className="staff-input" defaultValue={status} name="status">
          {requestStatuses.map((value) => (
            <option key={value} value={value}>
              {requestStatusLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="staff-field">
        {copy.staffNotes}
        <input
          className="staff-input"
          defaultValue={staffNotes ?? ""}
          maxLength={REASON_MAX_LENGTH}
          name="staffNotes"
        />
      </label>
      <button
        className="button button--secondary justify-self-start"
        disabled={pending}
        type="submit"
      >
        {adoption.manage.updateRequest}
      </button>
      <Feedback pending={pending} state={state} />
    </form>
  );
}

export function DeletePetForm({ petId }: { petId: string }) {
  const [state, action, pending] = useActionState(deletePet, {});
  return (
    <form action={action} className="grid gap-3">
      <PetIdField petId={petId} />
      <p className="text-sm text-muted">{copy.deleteHint}</p>
      <label className="inline-flex min-h-8 items-center gap-2 text-sm">
        <input name="confirm" required type="checkbox" />
        {copy.deleteConfirm}
      </label>
      <Feedback pending={pending} state={state} />
      <button className="button button--danger justify-self-start" disabled={pending} type="submit">
        {copy.delete}
      </button>
    </form>
  );
}

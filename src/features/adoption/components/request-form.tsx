"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useCallback, useState } from "react";

import { SelectField, TextField } from "@/components/ui/form-fields";
import { DraftGate } from "@/features/media/components/draft-gate";
import { adoption } from "@/messages/es-MX/adoption";
import { campusRelationshipLabels, housingTypeLabels } from "@/messages/es-MX/enums";

import { createAdoptionRequest } from "../actions";
import { campusRelationships, housingTypes } from "../enums";
import { CONTACT_NAME_MAX_LENGTH, MOTIVATION_MAX_LENGTH, PHONE_MAX_LENGTH } from "../schema";

import type { CreateRequestState } from "../actions";

const copy = adoption.request;
const relationshipOptions = campusRelationships.map((value) => ({
  value,
  label: campusRelationshipLabels[value],
}));
const housingOptions = housingTypes.map((value) => ({ value, label: housingTypeLabels[value] }));
const yesNoOptions = [
  { value: "yes", label: copy.yes },
  { value: "no", label: copy.no },
] as const;

export function AdoptionRequestForm({ petId, petName }: { petId: string; petName: string }) {
  const [draftToken, setDraftToken] = useState<string>();
  const [gateKey, setGateKey] = useState(0);
  const [state, action, pending] = useActionState(
    async (previous: CreateRequestState, form: FormData) => {
      const next = await createAdoptionRequest(petId, previous, form);
      if (next.draftExpired) {
        setDraftToken(undefined);
        setGateKey((current) => current + 1);
      }
      return next;
    },
    {},
  );
  const handleDraft = useCallback((draft: { draftToken: string } | undefined) => {
    setDraftToken(draft?.draftToken);
  }, []);

  if (state.ok) {
    return (
      <p className="flex items-start gap-3 rounded-card border border-line bg-panel p-5">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-accent" size={20} />
        <output>{copy.done}</output>
      </p>
    );
  }

  const invalid = state.fieldErrors ?? {};
  return (
    <form action={action} className="report-panel">
      <div className="grid gap-1">
        <h2 className="text-xl font-semibold tracking-tight">{copy.title(petName)}</h2>
        <p className="text-sm text-muted">{copy.description}</p>
      </div>
      <TextField
        autoComplete="name"
        invalid={invalid.fullName}
        label={copy.fullName}
        maxLength={CONTACT_NAME_MAX_LENGTH}
        name="fullName"
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          autoComplete="email"
          invalid={invalid.email}
          label={copy.email}
          name="email"
          required
          type="email"
        />
        <TextField
          autoComplete="tel"
          inputMode="tel"
          invalid={invalid.phone}
          label={copy.phone}
          maxLength={PHONE_MAX_LENGTH}
          name="phone"
          type="tel"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          invalid={invalid.campusRelationship}
          label={copy.campusRelationship}
          name="campusRelationship"
          options={relationshipOptions}
          placeholder={adoption.post.select}
        />
        <SelectField
          invalid={invalid.housingType}
          label={copy.housingType}
          name="housingType"
          options={housingOptions}
          placeholder={adoption.post.select}
        />
        <SelectField
          invalid={invalid.hasOtherPets}
          label={copy.hasOtherPets}
          name="hasOtherPets"
          options={yesNoOptions}
          placeholder={adoption.post.select}
        />
        <SelectField
          invalid={invalid.hasExperience}
          label={copy.hasExperience}
          name="hasExperience"
          options={yesNoOptions}
          placeholder={adoption.post.select}
        />
      </div>
      <TextField
        hint={copy.motivationHint}
        invalid={invalid.motivation}
        label={copy.motivation}
        maxLength={MOTIVATION_MAX_LENGTH}
        minLength={20}
        multiline
        name="motivation"
        required
      />
      <div className="flex items-start gap-2 text-sm">
        <input
          aria-invalid={invalid.consent ? true : undefined}
          className="mt-1"
          id="consent"
          name="consent"
          required
          type="checkbox"
        />
        <div className="grid gap-1">
          <label htmlFor="consent">{copy.consent}</label>
          <Link className="underline" href="/privacy" target="_blank">
            {copy.privacy}
          </Link>
        </div>
      </div>
      <input name="draftToken" type="hidden" value={draftToken ?? ""} />
      <DraftGate key={gateKey} onDraft={handleDraft} scope="request" />
      <output aria-live="polite" className="report-error text-sm">
        {state.error}
      </output>
      <button
        className="button button--primary justify-self-start"
        disabled={pending || !draftToken}
        type="submit"
      >
        {pending ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}

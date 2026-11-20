"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useCallback, useMemo, useState } from "react";

import { SelectField, TextField } from "@/components/ui/form-fields";
import { DraftGate } from "@/features/media/components/draft-gate";
import { PhotoPicker } from "@/features/media/components/photo-picker";
import { mediaLimits } from "@/features/media/keys";
import { adoption } from "@/messages/es-MX/adoption";
import {
  ageGroupLabels,
  healthStateLabels,
  sexLabels,
  sizeLabels,
  speciesLabels,
  temperamentLabels,
} from "@/messages/es-MX/enums";

import { createPet } from "../actions";
import { ageGroups, healthStates, sexes, sizes, species, temperaments } from "../enums";
import {
  CONTACT_NAME_MAX_LENGTH,
  PET_AREA_MAX_LENGTH,
  PET_NAME_MAX_LENGTH,
  PET_NOTES_MAX_LENGTH,
  PET_STORY_MAX_LENGTH,
  PHONE_MAX_LENGTH,
} from "../schema";

import type { CreatePetState } from "../actions";

const copy = adoption.post;
const toOptions = <Value extends string>(
  values: readonly Value[],
  labels: Readonly<Record<Value, string>>,
) => values.map((value) => ({ value, label: labels[value] }));
const speciesOptions = toOptions(species, speciesLabels);
const sexOptions = toOptions(sexes, sexLabels);
const ageOptions = toOptions(ageGroups, ageGroupLabels);
const sizeOptions = toOptions(sizes, sizeLabels);
const healthOptions = toOptions(healthStates, healthStateLabels);

function PostForm({
  areas,
  uploadsEnabled,
  onReset,
}: {
  areas: { id: string; name: string }[];
  uploadsEnabled: boolean;
  onReset: () => void;
}) {
  const [draftToken, setDraftToken] = useState<string>();
  const [gateKey, setGateKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const photoTarget = useMemo(() => ({ scope: "pet" as const, draftToken }), [draftToken]);
  const areaOptions = useMemo(
    () => areas.map((area) => ({ value: area.id, label: area.name })),
    [areas],
  );
  const [state, action, pending] = useActionState(
    async (previous: CreatePetState, form: FormData) => {
      const next = await createPet(previous, form);
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

  const copyLink = useCallback(async () => {
    if (!state.manageUrl) return;
    await navigator.clipboard.writeText(state.manageUrl);
    setCopied(true);
  }, [state.manageUrl]);

  if (state.ok && state.manageUrl) {
    return (
      <section aria-labelledby="pet-posted" className="report-panel">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
            <CheckCircle2 aria-hidden="true" size={20} />
          </span>
          <div className="grid gap-1">
            <h2 className="text-xl font-semibold tracking-tight" id="pet-posted">
              {copy.done.title}
            </h2>
            <p className="max-w-prose text-sm text-muted">{copy.done.description}</p>
          </div>
        </div>
        <label className="report-field">
          {copy.done.manage}
          <input className="report-input font-mono text-sm" readOnly value={state.manageUrl} />
        </label>
        <p className="text-sm text-muted">{copy.done.manageHint}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button className="button button--secondary" onClick={copyLink} type="button">
            {copy.done.copy}
          </button>
          <output className="text-sm text-muted">{copied ? copy.done.copied : undefined}</output>
          <button className="button button--ghost" onClick={onReset} type="button">
            {copy.done.another}
          </button>
        </div>
      </section>
    );
  }

  const invalid = state.fieldErrors ?? {};
  return (
    <form action={action} className="report-panel">
      <fieldset className="m-0 grid gap-4 border-0 p-0">
        <legend className="mb-2 text-lg font-semibold">{copy.profile}</legend>
        <TextField
          invalid={invalid.name}
          label={copy.name}
          maxLength={PET_NAME_MAX_LENGTH}
          name="name"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            invalid={invalid.species}
            label={copy.species}
            name="species"
            options={speciesOptions}
            placeholder={copy.select}
          />
          <TextField
            invalid={invalid.speciesOther}
            label={copy.speciesOther}
            maxLength={40}
            name="speciesOther"
          />
          <SelectField
            invalid={invalid.sex}
            label={copy.sex}
            name="sex"
            options={sexOptions}
            placeholder={copy.select}
          />
          <SelectField
            invalid={invalid.ageGroup}
            label={copy.ageGroup}
            name="ageGroup"
            options={ageOptions}
            placeholder={copy.select}
          />
          <SelectField
            invalid={invalid.size}
            label={copy.size}
            name="size"
            options={sizeOptions}
            placeholder={copy.select}
          />
        </div>
        <fieldset className="m-0 grid gap-2 border-0 p-0">
          <legend className="report-field">{copy.temperament}</legend>
          <p className="text-sm text-muted">{copy.temperamentHint}</p>
          <div className="flex flex-wrap gap-2">
            {temperaments.map((value) => (
              <label className="pet-chip-option" key={value}>
                <input className="sr-only" name="temperament" type="checkbox" value={value} />
                <span>{temperamentLabels[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </fieldset>

      <fieldset className="m-0 grid gap-4 border-t border-line p-0 pt-4">
        <legend className="mb-2 text-lg font-semibold">{copy.health}</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            defaultValue="unknown"
            label={copy.vaccinated}
            name="vaccinated"
            options={healthOptions}
          />
          <SelectField
            defaultValue="unknown"
            label={copy.sterilized}
            name="sterilized"
            options={healthOptions}
          />
          <SelectField
            defaultValue="unknown"
            label={copy.dewormed}
            name="dewormed"
            options={healthOptions}
          />
        </div>
        <TextField
          label={copy.healthNotes}
          maxLength={PET_NOTES_MAX_LENGTH}
          multiline
          name="healthNotes"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            invalid={invalid.buildingId}
            label={copy.area}
            name="buildingId"
            options={areaOptions}
            placeholder={copy.areaNone}
            required={false}
          />
          <TextField
            label={copy.areaReference}
            maxLength={PET_AREA_MAX_LENGTH}
            name="areaReference"
          />
        </div>
        <TextField
          hint={copy.storyHint}
          invalid={invalid.story}
          label={copy.story}
          maxLength={PET_STORY_MAX_LENGTH}
          minLength={20}
          multiline
          name="story"
          required
        />
      </fieldset>

      {uploadsEnabled && (
        <PhotoPicker
          max={mediaLimits.pet_gallery}
          onBusyChange={setUploading}
          target={photoTarget}
        />
      )}

      <fieldset className="m-0 grid gap-4 border-t border-line p-0 pt-4">
        <legend className="mb-1 text-lg font-semibold">{copy.contact}</legend>
        <p className="text-sm text-muted">{copy.contactHint}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            autoComplete="name"
            invalid={invalid.posterName}
            label={copy.posterName}
            maxLength={CONTACT_NAME_MAX_LENGTH}
            name="posterName"
            required
          />
          <TextField
            autoComplete="email"
            invalid={invalid.posterEmail}
            label={copy.posterEmail}
            name="posterEmail"
            required
            type="email"
          />
          <TextField
            autoComplete="tel"
            inputMode="tel"
            invalid={invalid.posterPhone}
            label={copy.posterPhone}
            maxLength={PHONE_MAX_LENGTH}
            name="posterPhone"
            type="tel"
          />
        </div>
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
              {adoption.request.privacy}
            </Link>
          </div>
        </div>
      </fieldset>

      <input name="draftToken" type="hidden" value={draftToken ?? ""} />
      <DraftGate key={gateKey} onDraft={handleDraft} scope="pet" />
      <output aria-live="polite" className="report-error text-sm">
        {state.error}
      </output>
      <button
        className="button button--primary justify-self-start"
        disabled={pending || uploading || !draftToken}
        type="submit"
      >
        {pending ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}

export function PostPetForm({
  areas,
  uploadsEnabled,
}: {
  areas: { id: string; name: string }[];
  uploadsEnabled: boolean;
}) {
  const [formKey, setFormKey] = useState(0);
  const reset = useCallback(() => setFormKey((current) => current + 1), []);
  return <PostForm areas={areas} key={formKey} onReset={reset} uploadsEnabled={uploadsEnabled} />;
}

"use client";

import { Check, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useCallback, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { CategoryIcon } from "@/features/catalog/category-icon";
import { DraftGate } from "@/features/media/components/draft-gate";
import { PhotoPicker } from "@/features/media/components/photo-picker";
import { mediaLimits } from "@/features/media/keys";
import { navForward } from "@/lib/navigation";
import { reports } from "@/messages/es-MX/reports";

import { createReport } from "../actions";
import {
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_LOCATION_MAX_LENGTH,
  REPORT_REPORTER_EMAIL_MAX_LENGTH,
  REPORT_REPORTER_NAME_MAX_LENGTH,
} from "../schema";
import { SimilarReports } from "./similar-reports";

import type { CreateReportActionState } from "../actions";
import type { ReportCatalogBuilding, ReportCatalogCategory } from "../repository";
import type { ReportTopicKey } from "../topics";
import type { ChangeEvent, ReactNode } from "react";

const copy = reports.form;

function StepLegend({ step, children }: { step: number; children: ReactNode }) {
  return (
    <legend className="report-step-legend">
      <span aria-hidden="true" className="report-step-number">
        {step}
      </span>
      {children}
    </legend>
  );
}

/** Shows the character count only when the visitor approaches the limit. */
function CharacterCount({ length, max }: { length: number; max: number }) {
  if (length < max * 0.8) return null;
  return <span className="font-mono text-xs">{copy.characterCount(length, max)}</span>;
}

type NewReportFormProps = {
  categories: ReportCatalogCategory[];
  buildings: ReportCatalogBuilding[];
  /** Categories of the topic the visitor came from, shown before the rest of the catalog. */
  focusCategoryIds?: string[];
  initialCategoryId?: string;
  initialBuildingId?: string;
  topic?: ReportTopicKey | undefined;
  uploadsEnabled?: boolean;
};

const noCategoryIds: string[] = [];

function NewReportFormInner({
  categories,
  buildings,
  focusCategoryIds = noCategoryIds,
  initialCategoryId = "",
  initialBuildingId = "",
  topic,
  uploadsEnabled = false,
  onReset,
}: NewReportFormProps & { onReset: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [draftToken, setDraftToken] = useState<string>();
  const [gateKey, setGateKey] = useState(0);
  const photoTarget = useMemo(() => ({ scope: "report" as const, draftToken }), [draftToken]);
  const [state, action, pending] = useActionState(
    async (previous: CreateReportActionState, form: FormData) => {
      const next = await createReport(previous, form);
      if (next.draftExpired) {
        setDraftToken(undefined);
        setGateKey((current) => current + 1);
      }
      return next;
    },
    {},
  );
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [showAllCategories, setShowAllCategories] = useState(
    () =>
      focusCategoryIds.length === 0 ||
      (initialCategoryId !== "" && !focusCategoryIds.includes(initialCategoryId)),
  );
  const categoryGrid = useRef<HTMLDivElement>(null);
  const visibleCategories = useMemo(() => {
    if (showAllCategories) return categories;
    return focusCategoryIds.flatMap((id) => categories.filter((category) => category.id === id));
  }, [categories, focusCategoryIds, showAllCategories]);
  const topicCopy = topic ? reports.topics[topic] : undefined;
  const [buildingId, setBuildingId] = useState(initialBuildingId);
  const [locationReference, setLocationReference] = useState("");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string>();

  const handleDraft = useCallback((draft: { draftToken: string } | undefined) => {
    setDraftToken(draft?.draftToken);
  }, []);

  const handleCategoryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setCategoryId(event.currentTarget.value);
  }, []);

  const handleBuildingChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setBuildingId(event.currentTarget.value);
  }, []);

  const handleLocationChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setLocationReference(event.currentTarget.value);
  }, []);

  const handleDescriptionChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(event.currentTarget.value);
  }, []);

  const handleReporterNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setReporterName(event.currentTarget.value);
  }, []);

  const handleReporterEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setReporterEmail(event.currentTarget.value);
  }, []);

  function revealAllCategories() {
    const firstHidden = categories.find((category) => !focusCategoryIds.includes(category.id));
    flushSync(() => setShowAllCategories(true));
    // The toggle disappears, so keep keyboard focus inside the group on the first new option.
    const options = categoryGrid.current?.querySelectorAll<HTMLInputElement>("input[type=radio]");
    const target = [...(options ?? [])].find((option) => option.value === firstHidden?.id);
    target?.focus();
  }

  async function copyTrackingLink() {
    if (!state.report?.trackingUrl) return;
    await navigator.clipboard.writeText(state.report.trackingUrl);
    setCopiedUrl(state.report.trackingUrl);
  }

  if (state.ok && state.report) {
    const { number, trackingToken, trackingUrl } = state.report;
    const isCopied = copiedUrl === trackingUrl;

    return (
      <section aria-labelledby="report-created-heading" className="report-panel">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
            <CheckCircle2 aria-hidden="true" size={20} />
          </span>
          <div className="grid gap-1">
            <p className="font-mono text-sm font-medium text-muted">
              {reports.formatNumber(number)}
            </p>
            <h2 id="report-created-heading" className="text-xl font-semibold tracking-tight">
              {copy.success.title}
            </h2>
            <p className="max-w-prose text-sm leading-relaxed text-muted">
              {copy.success.description}
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <label className="report-field">
            {copy.success.trackingLinkLabel}
            <input
              className="report-input font-mono text-sm"
              readOnly
              value={trackingUrl}
              aria-describedby="tracking-link-hint"
            />
          </label>
          <p id="tracking-link-hint" className="text-sm text-muted">
            {copy.success.trackingLinkHint}
          </p>
          {state.report.confirmationEmailSent && (
            <p className="text-sm text-muted">{copy.success.emailSent}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button className="button button--secondary" type="button" onClick={copyTrackingLink}>
              {copy.success.copyLink}
            </button>
            <output className="text-sm text-muted">
              {isCopied ? copy.success.copied : undefined}
            </output>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            className="button button--primary"
            href={`/reports/track/${trackingToken}`}
            transitionTypes={navForward}
          >
            {copy.success.viewReport}
          </Link>
          <Link
            className="button button--secondary"
            href="/reports/mine"
            transitionTypes={navForward}
          >
            {copy.success.viewMine}
          </Link>
          <button className="button button--secondary" type="button" onClick={onReset}>
            {copy.submitAnother}
          </button>
        </div>
      </section>
    );
  }

  const fieldErrors = state.fieldErrors;
  const categoryError = fieldErrors?.categoryId;
  const buildingError = fieldErrors?.buildingId;
  const locationError = fieldErrors?.locationReference;
  const descriptionError = fieldErrors?.description;
  const reporterNameError = fieldErrors?.reporterName;
  const reporterEmailError = fieldErrors?.reporterEmail;

  const categoryDescribedBy = categoryError ? "category-hint category-error" : "category-hint";
  const locationDescribedBy = locationError ? "location-hint location-error" : "location-hint";
  const descriptionDescribedBy = descriptionError
    ? "description-hint description-error"
    : "description-hint";

  return (
    <form action={action} className="report-panel report-form">
      <fieldset
        aria-describedby={categoryDescribedBy}
        aria-invalid={categoryError ? true : undefined}
        className="report-step"
      >
        <StepLegend step={1}>{copy.categoryLabel}</StepLegend>
        <p id="category-hint" className="text-sm text-muted">
          {initialCategoryId ? copy.categoryPreselectedHint : copy.categoryHint}
        </p>
        <div className="report-category-grid" ref={categoryGrid}>
          {visibleCategories.map((category) => (
            <label className="report-category-option" key={category.id}>
              <input
                className="sr-only"
                type="radio"
                name="categoryId"
                value={category.id}
                checked={categoryId === category.id}
                onChange={handleCategoryChange}
                required
              />
              <span className="report-category-icon" aria-hidden="true">
                <CategoryIcon iconKey={category.iconKey} size={18} strokeWidth={1.8} />
              </span>
              <span className="text-sm leading-snug font-medium">{category.name}</span>
              <span className="report-category-check" aria-hidden="true">
                <Check size={14} strokeWidth={2.6} />
              </span>
            </label>
          ))}
        </div>
        {!showAllCategories && (
          <button
            className="button button--ghost button--sm justify-self-start"
            onClick={revealAllCategories}
            type="button"
          >
            {copy.showAllCategories}
          </button>
        )}
        {categoryError && (
          <p id="category-error" className="report-error text-sm" role="alert">
            {categoryError}
          </p>
        )}
      </fieldset>

      <fieldset className="report-step">
        <StepLegend step={2}>{copy.whereTitle}</StepLegend>
        <div className="grid gap-1.5">
          <label className="report-field" htmlFor="report-building">
            {copy.buildingLabel}
          </label>
          <select
            id="report-building"
            className="report-input"
            name="buildingId"
            value={buildingId}
            onChange={handleBuildingChange}
            aria-invalid={buildingError ? true : undefined}
            aria-describedby={buildingError ? "building-error" : undefined}
            required
          >
            <option value="" disabled>
              {copy.buildingPlaceholder}
            </option>
            {buildings.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {buildingError && (
            <p id="building-error" className="report-error text-sm" role="alert">
              {buildingError}
            </p>
          )}
        </div>

        <SimilarReports categoryId={categoryId} buildingId={buildingId} />

        <div className="grid gap-1.5">
          <label className="report-field" htmlFor="report-location">
            {copy.locationLabel}
          </label>
          <input
            id="report-location"
            className="report-input"
            name="locationReference"
            type="text"
            value={locationReference}
            onChange={handleLocationChange}
            placeholder={topicCopy?.locationPlaceholder ?? copy.locationPlaceholder}
            maxLength={REPORT_LOCATION_MAX_LENGTH}
            aria-invalid={locationError ? true : undefined}
            aria-describedby={locationDescribedBy}
            required
          />
          <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
            <p id="location-hint">{copy.locationHint}</p>
            <CharacterCount length={locationReference.length} max={REPORT_LOCATION_MAX_LENGTH} />
          </div>
          {locationError && (
            <p id="location-error" className="report-error text-sm" role="alert">
              {locationError}
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="report-step">
        <StepLegend step={3}>{copy.detailsTitle}</StepLegend>
        <div className="grid gap-1.5">
          <label className="report-field" htmlFor="report-description">
            {copy.descriptionLabel}
          </label>
          <textarea
            id="report-description"
            className="report-input"
            name="description"
            rows={3}
            value={description}
            onChange={handleDescriptionChange}
            placeholder={topicCopy?.descriptionPlaceholder ?? copy.descriptionPlaceholder}
            maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
            aria-invalid={descriptionError ? true : undefined}
            aria-describedby={descriptionDescribedBy}
            required
          />
          <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
            <p id="description-hint">{copy.descriptionHint}</p>
            <CharacterCount length={description.length} max={REPORT_DESCRIPTION_MAX_LENGTH} />
          </div>
          {descriptionError && (
            <p id="description-error" className="report-error text-sm" role="alert">
              {descriptionError}
            </p>
          )}
        </div>

        {uploadsEnabled && (
          <PhotoPicker
            target={photoTarget}
            max={mediaLimits.report_before}
            onBusyChange={setUploading}
          />
        )}
      </fieldset>

      <fieldset className="report-step">
        <StepLegend step={4}>{copy.optionalTitle}</StepLegend>
        <p className="text-sm text-muted">{copy.optionalHint}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label className="report-field" htmlFor="report-reporter-name">
              {copy.reporterNameLabel}
            </label>
            <input
              id="report-reporter-name"
              className="report-input"
              name="reporterName"
              type="text"
              value={reporterName}
              onChange={handleReporterNameChange}
              placeholder={copy.reporterNamePlaceholder}
              maxLength={REPORT_REPORTER_NAME_MAX_LENGTH}
              autoComplete="name"
              aria-invalid={reporterNameError ? true : undefined}
              aria-describedby={reporterNameError ? "reporter-name-error" : undefined}
            />
            {reporterNameError && (
              <p id="reporter-name-error" className="report-error text-sm" role="alert">
                {reporterNameError}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <label className="report-field" htmlFor="report-reporter-email">
              {copy.reporterEmailLabel}
            </label>
            <input
              id="report-reporter-email"
              className="report-input"
              name="reporterEmail"
              type="email"
              value={reporterEmail}
              onChange={handleReporterEmailChange}
              placeholder={copy.reporterEmailPlaceholder}
              maxLength={REPORT_REPORTER_EMAIL_MAX_LENGTH}
              autoComplete="email"
              aria-invalid={reporterEmailError ? true : undefined}
              aria-describedby={reporterEmailError ? "reporter-email-error" : undefined}
            />
            {reporterEmailError && (
              <p id="reporter-email-error" className="report-error text-sm" role="alert">
                {reporterEmailError}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <div className="report-submit">
        <input type="hidden" name="draftToken" value={draftToken ?? ""} />
        <DraftGate key={gateKey} scope="report" onDraft={handleDraft} />

        <output className="report-error text-sm">{state.error}</output>

        <button
          className="button button--primary w-full sm:w-auto sm:justify-self-start"
          disabled={pending || uploading || !draftToken}
          type="submit"
        >
          {pending ? copy.submitting : copy.submit}
        </button>
      </div>
    </form>
  );
}

export function NewReportForm(props: NewReportFormProps) {
  const [formKey, setFormKey] = useState(0);

  const resetForm = useCallback(() => {
    setFormKey((count) => count + 1);
  }, []);

  return <NewReportFormInner key={formKey} {...props} onReset={resetForm} />;
}

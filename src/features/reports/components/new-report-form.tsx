"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useCallback, useState } from "react";

import { CategoryIcon } from "@/features/catalog/category-icon";
import { DraftGate } from "@/features/media/components/draft-gate";
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
import type { ChangeEvent } from "react";

const copy = reports.form;

function NewReportFormInner({
  categories,
  buildings,
  initialBuildingId,
  onReset,
}: {
  categories: ReportCatalogCategory[];
  buildings: ReportCatalogBuilding[];
  initialBuildingId: string;
  onReset: () => void;
}) {
  const [draftToken, setDraftToken] = useState<string>();
  const [gateKey, setGateKey] = useState(0);
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
  const [categoryId, setCategoryId] = useState("");
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
    <form action={action} className="report-panel">
      <fieldset
        aria-describedby={categoryDescribedBy}
        aria-invalid={categoryError ? true : undefined}
        className="m-0 grid gap-3 border-0 p-0"
      >
        <legend className="text-sm font-semibold">{copy.categoryLabel}</legend>
        <p id="category-hint" className="text-sm text-muted">
          {copy.categoryHint}
        </p>
        <div className="report-category-grid">
          {categories.map((category) => (
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
            </label>
          ))}
        </div>
        {categoryError && (
          <p id="category-error" className="report-error text-sm" role="alert">
            {categoryError}
          </p>
        )}
      </fieldset>

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
          placeholder={copy.locationPlaceholder}
          maxLength={REPORT_LOCATION_MAX_LENGTH}
          aria-invalid={locationError ? true : undefined}
          aria-describedby={locationDescribedBy}
          required
        />
        <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
          <p id="location-hint">{copy.locationHint}</p>
          <span className="font-mono text-xs">
            {copy.characterCount(locationReference.length, REPORT_LOCATION_MAX_LENGTH)}
          </span>
        </div>
        {locationError && (
          <p id="location-error" className="report-error text-sm" role="alert">
            {locationError}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <label className="report-field" htmlFor="report-description">
          {copy.descriptionLabel}
        </label>
        <textarea
          id="report-description"
          className="report-input"
          name="description"
          rows={4}
          value={description}
          onChange={handleDescriptionChange}
          placeholder={copy.descriptionPlaceholder}
          maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
          aria-invalid={descriptionError ? true : undefined}
          aria-describedby={descriptionDescribedBy}
          required
        />
        <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
          <p id="description-hint">{copy.descriptionHint}</p>
          <span className="font-mono text-xs">
            {copy.characterCount(description.length, REPORT_DESCRIPTION_MAX_LENGTH)}
          </span>
        </div>
        {descriptionError && (
          <p id="description-error" className="report-error text-sm" role="alert">
            {descriptionError}
          </p>
        )}
      </div>

      <fieldset className="m-0 grid gap-3 border-t border-line pt-4">
        <legend className="text-sm font-semibold">{copy.optionalTitle}</legend>
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

      <input type="hidden" name="draftToken" value={draftToken ?? ""} />
      <DraftGate key={gateKey} scope="report" onDraft={handleDraft} />

      <output className="report-error text-sm">{state.error}</output>

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

export function NewReportForm({
  categories,
  buildings,
  initialBuildingId = "",
}: {
  categories: ReportCatalogCategory[];
  buildings: ReportCatalogBuilding[];
  initialBuildingId?: string;
}) {
  const [formKey, setFormKey] = useState(0);

  const resetForm = useCallback(() => {
    setFormKey((count) => count + 1);
  }, []);

  return (
    <NewReportFormInner
      key={formKey}
      categories={categories}
      buildings={buildings}
      initialBuildingId={initialBuildingId}
      onReset={resetForm}
    />
  );
}

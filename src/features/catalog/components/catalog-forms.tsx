"use client";

import { useActionState } from "react";

import { reportPriorities } from "@/features/reports/enums";
import { dashboard } from "@/messages/es-MX/dashboard";
import { reportPriorityLabels } from "@/messages/es-MX/enums";

import { saveBuilding, saveCategory } from "../actions";
import { CategoryIcon } from "../category-icon";
import { categoryIcons } from "../icons";

import type { CatalogState } from "../actions";
import type { ReportPriority } from "@/features/reports/enums";

const copy = dashboard.catalog;
const iconKeys = Object.keys(categoryIcons);

function Feedback({ state, pending }: { state: CatalogState; pending: boolean }) {
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

type BuildingValues = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  sortOrder: number;
  isActive: boolean;
};

export function BuildingForm({ value }: { value?: BuildingValues }) {
  const [state, action, pending] = useActionState(saveBuilding, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input name="id" type="hidden" value={value?.id ?? ""} />
      <label className="staff-field">
        {copy.name}
        <input
          className="staff-input"
          defaultValue={value?.name}
          maxLength={80}
          name="name"
          required
        />
      </label>
      <label className="staff-field">
        {copy.shortName}
        <input
          className="staff-input"
          defaultValue={value?.shortName}
          maxLength={40}
          name="shortName"
          required
        />
      </label>
      <label className="staff-field">
        {copy.slug}
        <input
          className="staff-input font-mono"
          defaultValue={value?.slug}
          maxLength={60}
          name="slug"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
          title={copy.slugHint}
        />
      </label>
      <label className="staff-field">
        {copy.sortOrder}
        <input
          className="staff-input"
          defaultValue={value?.sortOrder ?? 0}
          max={999}
          min={0}
          name="sortOrder"
          type="number"
        />
      </label>
      <label className="inline-flex min-h-8 items-center gap-2 text-sm">
        <input defaultChecked={value?.isActive ?? true} name="isActive" type="checkbox" />
        {copy.active}
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className="button button--primary" disabled={pending} type="submit">
          {value ? copy.save : copy.create}
        </button>
        <Feedback pending={pending} state={state} />
      </div>
    </form>
  );
}

type CategoryValues = {
  id: string;
  slug: string;
  name: string;
  iconKey: string;
  defaultPriority: ReportPriority;
  sortOrder: number;
  isActive: boolean;
};

export function CategoryForm({ value }: { value?: CategoryValues }) {
  const [state, action, pending] = useActionState(saveCategory, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input name="id" type="hidden" value={value?.id ?? ""} />
      <label className="staff-field">
        {copy.name}
        <input
          className="staff-input"
          defaultValue={value?.name}
          maxLength={80}
          name="name"
          required
        />
      </label>
      <label className="staff-field">
        {copy.slug}
        <input
          className="staff-input font-mono"
          defaultValue={value?.slug}
          maxLength={60}
          name="slug"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
          title={copy.slugHint}
        />
      </label>
      <fieldset className="m-0 grid gap-2 border-0 p-0 sm:col-span-2">
        <legend className="staff-field">{copy.icon}</legend>
        <div className="flex flex-wrap gap-2">
          {iconKeys.map((key) => (
            <label className="pet-chip-option" key={key}>
              <input
                className="sr-only"
                defaultChecked={(value?.iconKey ?? "circle-help") === key}
                name="iconKey"
                type="radio"
                value={key}
              />
              <CategoryIcon iconKey={key} size={18} strokeWidth={1.8} />
              <span className="sr-only">{key}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="staff-field">
        {copy.priority}
        <select
          className="staff-input"
          defaultValue={value?.defaultPriority ?? "normal"}
          name="defaultPriority"
        >
          {reportPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {reportPriorityLabels[priority]}
            </option>
          ))}
        </select>
      </label>
      <label className="staff-field">
        {copy.sortOrder}
        <input
          className="staff-input"
          defaultValue={value?.sortOrder ?? 0}
          max={999}
          min={0}
          name="sortOrder"
          type="number"
        />
      </label>
      <label className="inline-flex min-h-8 items-center gap-2 text-sm">
        <input defaultChecked={value?.isActive ?? true} name="isActive" type="checkbox" />
        {copy.active}
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className="button button--primary" disabled={pending} type="submit">
          {value ? copy.save : copy.create}
        </button>
        <Feedback pending={pending} state={state} />
      </div>
    </form>
  );
}

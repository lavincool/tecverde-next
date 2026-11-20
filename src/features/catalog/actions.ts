"use server";

import { revalidatePath } from "next/cache";

import { formText } from "@/lib/form-text";
import { dashboard } from "@/messages/es-MX/dashboard";
import { requireStaff, StaffAccessError } from "@/server/auth/guards";
import { db } from "@/server/db";

import {
  buildingInputSchema,
  CatalogError,
  categoryInputSchema,
  upsertBuildingRecord,
  upsertCategoryRecord,
} from "./repository";

export type CatalogState = { ok?: true; error?: string };

const copy = dashboard.catalog;

function failure(error: unknown): CatalogState {
  if (error instanceof StaffAccessError) {
    return {
      error: error.status === 401 ? dashboard.staff.signInAgain : dashboard.staff.forbidden,
    };
  }
  if (error instanceof CatalogError) return { error: copy.failures[error.reason] };
  return { error: dashboard.login.unavailable };
}

function refresh() {
  revalidatePath("/dashboard/catalog");
  revalidatePath("/reports/new");
  revalidatePath("/adopt");
}

export async function saveBuilding(_: CatalogState, form: FormData): Promise<CatalogState> {
  try {
    const staff = await requireStaff({ catalog: ["manage"] });
    const parsed = buildingInputSchema.safeParse({
      id: formText(form, "id"),
      slug: formText(form, "slug"),
      name: formText(form, "name"),
      shortName: formText(form, "shortName"),
      sortOrder: formText(form, "sortOrder"),
      isActive: form.get("isActive") === "on",
    });
    if (!parsed.success) return { error: copy.failures.invalid };
    await upsertBuildingRecord(db, parsed.data, staff.id);
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function saveCategory(_: CatalogState, form: FormData): Promise<CatalogState> {
  try {
    const staff = await requireStaff({ catalog: ["manage"] });
    const parsed = categoryInputSchema.safeParse({
      id: formText(form, "id"),
      slug: formText(form, "slug"),
      name: formText(form, "name"),
      iconKey: formText(form, "iconKey"),
      defaultPriority: formText(form, "defaultPriority"),
      sortOrder: formText(form, "sortOrder"),
      isActive: form.get("isActive") === "on",
    });
    if (!parsed.success) return { error: copy.failures.invalid };
    await upsertCategoryRecord(db, parsed.data, staff.id);
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

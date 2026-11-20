"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { formText } from "@/lib/form-text";
import { dashboard } from "@/messages/es-MX/dashboard";
import { requireStaff, StaffAccessError } from "@/server/auth/guards";
import { db } from "@/server/db";

import {
  addReportComment,
  assignReport,
  assignSchema,
  changeReportStatus,
  commentSchema,
  duplicateSchema,
  markReportDuplicate,
  priorityChangeSchema,
  ReportTriageError,
  resolveReport,
  resolveSchema,
  setReportPriority,
  softDeleteReport,
  statusChangeSchema,
} from "./triage";

import type { StatusChange } from "./triage";
import type { StaffPermission } from "@/server/auth/permissions";
import type { z } from "zod";

export type TriageActionState = { ok?: true; error?: string };

const copy = dashboard.reports;

function failure(error: unknown): TriageActionState {
  if (error instanceof StaffAccessError) {
    return {
      error: error.status === 401 ? dashboard.staff.signInAgain : dashboard.staff.forbidden,
    };
  }
  if (error instanceof ReportTriageError) return { error: copy.failures[error.reason] };
  return { error: dashboard.login.unavailable };
}

function refreshReport(reportId: string) {
  revalidatePath("/dashboard/reports");
  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath("/dashboard/metrics");
  revalidatePath("/reports/mine");
}

async function runTriage<Schema extends z.ZodType>(
  permission: StaffPermission,
  schema: Schema,
  raw: Record<string, string>,
  run: (
    input: z.output<Schema>,
    actor: Awaited<ReturnType<typeof requireStaff>>,
  ) => Promise<StatusChange | void>,
): Promise<TriageActionState> {
  try {
    const actor = await requireStaff(permission);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { error: copy.failures.invalid };
    await run(parsed.data, actor);
    refreshReport(raw.reportId ?? "");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateReportStatus(_: TriageActionState, form: FormData) {
  return runTriage(
    { report: ["triage"] },
    statusChangeSchema,
    {
      reportId: formText(form, "reportId"),
      status: formText(form, "status"),
      note: formText(form, "note"),
    },
    (input, actor) => changeReportStatus(db, input, actor),
  );
}

export async function setPriority(_: TriageActionState, form: FormData) {
  return runTriage(
    { report: ["triage"] },
    priorityChangeSchema,
    { reportId: formText(form, "reportId"), priority: formText(form, "priority") },
    (input, actor) => setReportPriority(db, input, actor),
  );
}

export async function assign(_: TriageActionState, form: FormData) {
  return runTriage(
    { report: ["assign"] },
    assignSchema,
    { reportId: formText(form, "reportId"), assigneeId: formText(form, "assigneeId") },
    async (input, actor) => {
      await assignReport(db, input, actor);
    },
  );
}

export async function markDuplicate(_: TriageActionState, form: FormData) {
  return runTriage(
    { report: ["triage"] },
    duplicateSchema,
    { reportId: formText(form, "reportId"), targetNumber: formText(form, "targetNumber") },
    async (input, actor) => {
      const change = await markReportDuplicate(db, input, actor);
      revalidatePath(`/dashboard/reports/${change.targetId}`);
      return change;
    },
  );
}

export async function addComment(_: TriageActionState, form: FormData) {
  return runTriage(
    { report: ["triage"] },
    commentSchema,
    { reportId: formText(form, "reportId"), body: formText(form, "body") },
    async (input, actor) => {
      await addReportComment(db, input, actor);
    },
  );
}

export async function resolve(_: TriageActionState, form: FormData) {
  return runTriage(
    { report: ["resolve"] },
    resolveSchema,
    { reportId: formText(form, "reportId"), note: formText(form, "note") },
    (input, actor) => resolveReport(db, input, actor),
  );
}

export async function deleteReport(_: TriageActionState, form: FormData) {
  const result = await runTriage(
    { report: ["delete"] },
    statusChangeSchema.pick({ reportId: true }),
    { reportId: formText(form, "reportId") },
    async (input, actor) => {
      await softDeleteReport(db, input, actor);
    },
  );
  if (result.ok) redirect("/dashboard/reports");
  return result;
}

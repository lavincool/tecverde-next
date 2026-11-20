"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { consumeDraftForDevice, DraftError, readDraftForDevice } from "@/features/media/drafts";
import { formText } from "@/lib/form-text";
import { errors } from "@/messages/es-MX/errors";
import { reports } from "@/messages/es-MX/reports";
import { db } from "@/server/db";
import {
  ensureDeviceHash,
  getAppOrigin,
  getDeviceHash,
  getRequestIpHash,
  requireHashSecret,
} from "@/server/security/device";
import { getRateLimiter } from "@/server/security/rate-limit";
import { publicSubmissionsEnabled } from "@/server/security/submissions";

import { createReportRecord, ReportMutationError } from "./mutations";
import { confirmReportRecord, listSimilarOpenReports } from "./repository";
import { createReportInputSchema, reportFieldNames } from "./schema";

import type { ConfirmationResult, SimilarReport } from "./repository";
import type { ReportFieldName } from "./schema";

export type CreateReportActionState = {
  ok?: true;
  error?: string;
  draftExpired?: true;
  fieldErrors?: Partial<Record<ReportFieldName, string>>;
  values?: Partial<Record<ReportFieldName, string>>;
  report?: {
    id: string;
    number: number;
    trackingToken: string;
    trackingUrl: string;
  };
};

const REPORT_RATE_WINDOW_SECONDS = 600;
const REPORT_DEVICE_LIMIT = 5;
const REPORT_IP_LIMIT = 10;

function isReportFieldName(value: unknown): value is ReportFieldName {
  return typeof value === "string" && reportFieldNames.some((field) => field === value);
}

export async function createReport(
  _: CreateReportActionState,
  form: FormData,
): Promise<CreateReportActionState> {
  const raw: Record<ReportFieldName, string> = {
    categoryId: formText(form, "categoryId"),
    buildingId: formText(form, "buildingId"),
    locationReference: formText(form, "locationReference"),
    description: formText(form, "description"),
    reporterName: formText(form, "reporterName"),
    reporterEmail: formText(form, "reporterEmail"),
  };

  if (!publicSubmissionsEnabled()) {
    return { error: errors.submissions.disabled, values: raw };
  }
  const draftToken = formText(form, "draftToken");

  const parsed = createReportInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<ReportFieldName, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (isReportFieldName(field) && !fieldErrors[field]) {
        fieldErrors[field] = reports.form.fieldErrors[field];
      }
    }
    return {
      error: reports.form.invalidForm,
      fieldErrors,
      values: raw,
    };
  }

  try {
    const secret = requireHashSecret();
    await readDraftForDevice("report", draftToken);
    const [deviceHash, ipHash] = await Promise.all([ensureDeviceHash(), getRequestIpHash()]);

    const limiter = getRateLimiter();
    const [deviceLimit, ipLimit] = await Promise.all([
      limiter.consume(
        `tecverde:report:device:${deviceHash}`,
        REPORT_DEVICE_LIMIT,
        REPORT_RATE_WINDOW_SECONDS,
      ),
      limiter.consume(`tecverde:report:ip:${ipHash}`, REPORT_IP_LIMIT, REPORT_RATE_WINDOW_SECONDS),
    ]);
    if (!deviceLimit.allowed || !ipLimit.allowed) {
      throw new ReportMutationError("rate_limited");
    }
    await consumeDraftForDevice("report", draftToken);

    const created = await createReportRecord(db, { ...parsed.data, deviceHash, ipHash }, secret);
    const trackingUrl = new URL(`/reports/track/${created.trackingToken}`, await getAppOrigin())
      .href;

    revalidatePath("/reports/mine");

    return {
      ok: true,
      report: {
        id: created.id,
        number: created.number,
        trackingToken: created.trackingToken,
        trackingUrl,
      },
    };
  } catch (error) {
    if (error instanceof DraftError) {
      return { error: errors.submissions[error.reason], values: raw, draftExpired: true };
    }
    if (error instanceof ReportMutationError) {
      return {
        error: reports.form.failures[error.reason],
        values: raw,
      };
    }
    return {
      error: reports.form.unavailable,
      values: raw,
    };
  }
}

const similarInputSchema = z.object({ categoryId: z.uuidv7(), buildingId: z.uuidv7() });
const SIMILAR_LOOKUP_LIMIT = 60;
const CONFIRM_LIMIT = 30;
const CONFIRM_WINDOW_SECONDS = 3600;

export type SimilarReportsResult =
  | { status: "ready"; reports: SimilarReport[] }
  | { status: "unavailable" };

export async function findSimilarReports(input: {
  categoryId: string;
  buildingId: string;
}): Promise<SimilarReportsResult> {
  const parsed = similarInputSchema.safeParse(input);
  if (!parsed.success) return { status: "ready", reports: [] };
  try {
    const deviceHash = await getDeviceHash();
    const ipHash = await getRequestIpHash();
    const limit = await getRateLimiter().consume(
      `tecverde:report:similar:${deviceHash ?? ipHash}`,
      SIMILAR_LOOKUP_LIMIT,
      REPORT_RATE_WINDOW_SECONDS,
    );
    if (!limit.allowed) return { status: "unavailable" };
    const similar = await listSimilarOpenReports(db, { ...parsed.data, deviceHash });
    return { status: "ready", reports: similar };
  } catch {
    return { status: "unavailable" };
  }
}

export type ConfirmReportResult = {
  result: ConfirmationResult | "rate_limited" | "unavailable";
  confirmationsCount?: number;
  message: string;
};

export async function confirmReport(reportId: string): Promise<ConfirmReportResult> {
  if (!publicSubmissionsEnabled()) {
    return { result: "unavailable", message: errors.submissions.disabled };
  }
  const parsed = z.uuidv7().safeParse(reportId);
  if (!parsed.success) {
    return { result: "not_found", message: reports.similar.results.not_found };
  }
  try {
    const deviceHash = await ensureDeviceHash();
    const limit = await getRateLimiter().consume(
      `tecverde:report:confirm:${deviceHash}`,
      CONFIRM_LIMIT,
      CONFIRM_WINDOW_SECONDS,
    );
    if (!limit.allowed) {
      return { result: "rate_limited", message: reports.similar.results.rate_limited };
    }
    const outcome = await confirmReportRecord(db, { reportId: parsed.data, deviceHash });
    return { ...outcome, message: reports.similar.results[outcome.result] };
  } catch {
    return { result: "unavailable", message: reports.similar.results.unavailable };
  }
}

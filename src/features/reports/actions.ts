"use server";

import { revalidatePath } from "next/cache";

import { formText } from "@/lib/form-text";
import { reports } from "@/messages/es-MX/reports";
import { db } from "@/server/db";
import {
  ensureDeviceHash,
  getAppOrigin,
  getRequestIpHash,
  requireHashSecret,
} from "@/server/security/device";
import { getRateLimiter } from "@/server/security/rate-limit";

import { createReportRecord, ReportMutationError } from "./mutations";
import { createReportInputSchema, reportFieldNames } from "./schema";

import type { ReportFieldName } from "./schema";

export type CreateReportActionState = {
  ok?: true;
  error?: string;
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

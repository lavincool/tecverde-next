import { z } from "zod";

export const REPORT_LOCATION_MAX_LENGTH = 120;
export const REPORT_DESCRIPTION_MAX_LENGTH = 500;
export const REPORT_REPORTER_NAME_MAX_LENGTH = 100;
export const REPORT_REPORTER_EMAIL_MAX_LENGTH = 254;
export const TRIAGE_NOTE_MAX_LENGTH = 500;
export const TRIAGE_COMMENT_MAX_LENGTH = 1000;

export const reportFieldNames = [
  "categoryId",
  "buildingId",
  "locationReference",
  "description",
  "reporterName",
  "reporterEmail",
] as const;

export type ReportFieldName = (typeof reportFieldNames)[number];

export const reportIdSchema = z.uuidv7();
export const trackingTokenSchema = z.string().regex(/^[\w-]{43}$/);

const optionalNameSchema = z
  .string()
  .default("")
  .pipe(
    z
      .string()
      .trim()
      .max(REPORT_REPORTER_NAME_MAX_LENGTH)
      .transform((value) => (value.length > 0 ? value : null)),
  );

const optionalEmailSchema = z
  .string()
  .default("")
  .pipe(
    z
      .string()
      .trim()
      .transform((value) => (value.length > 0 ? value.toLowerCase() : null))
      .pipe(z.union([z.null(), z.email().max(REPORT_REPORTER_EMAIL_MAX_LENGTH)])),
  );

export const createReportInputSchema = z.object({
  categoryId: z.uuidv7(),
  buildingId: z.uuidv7(),
  locationReference: z.string().trim().min(1).max(REPORT_LOCATION_MAX_LENGTH),
  description: z.string().trim().min(1).max(REPORT_DESCRIPTION_MAX_LENGTH),
  reporterName: optionalNameSchema,
  reporterEmail: optionalEmailSchema,
});

export type CreateReportInput = z.output<typeof createReportInputSchema>;

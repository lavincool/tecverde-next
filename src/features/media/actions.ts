"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { media as mediaCopy } from "@/messages/es-MX/media";
import { requireStaff, StaffAccessError } from "@/server/auth/guards";
import { db } from "@/server/db";
import { pet } from "@/server/db/schema/adoption";
import { report } from "@/server/db/schema/reports";

import { DraftError, readDraftForDevice } from "./drafts";
import { issueUploadTickets, MediaError, uploadFilesSchema } from "./uploads";

import type { UploadTicket } from "./uploads";

export type UploadIntentResult =
  | { ok: true; tickets: UploadTicket[] }
  | { ok: false; error: string };

const intentSchema = z.discriminatedUnion("scope", [
  z.object({
    scope: z.literal("report"),
    draftToken: z.string().max(1024),
    files: uploadFilesSchema,
  }),
  z.object({ scope: z.literal("pet"), draftToken: z.string().max(1024), files: uploadFilesSchema }),
  z.object({ scope: z.literal("report_after"), reportId: z.uuidv7(), files: uploadFilesSchema }),
  z.object({ scope: z.literal("pet_staff"), petId: z.uuidv7(), files: uploadFilesSchema }),
]);

export type UploadIntentInput = z.input<typeof intentSchema>;

async function staffTarget(table: typeof report | typeof pet, id: string): Promise<boolean> {
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), isNull(table.deletedAt)))
    .limit(1);
  return Boolean(row);
}

/** Presigns direct-to-R2 uploads for an anonymous draft or a staff-owned entity. */
export async function createUploadIntent(input: UploadIntentInput): Promise<UploadIntentResult> {
  const parsed = intentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: mediaCopy.errors.invalid_file };
  const intent = parsed.data;

  try {
    if (intent.scope === "report" || intent.scope === "pet") {
      const draft = await readDraftForDevice(intent.scope, intent.draftToken);
      const tickets = await issueUploadTickets({
        kind: intent.scope === "report" ? "report_before" : "pet_gallery",
        ownerId: draft.draftId,
        files: intent.files,
        rateKey: draft.deviceHash,
        deviceHash: draft.deviceHash,
        uploadedByUserId: null,
      });
      return { ok: true, tickets };
    }

    if (intent.scope === "report_after") {
      const staff = await requireStaff({ report: ["resolve"] });
      if (!(await staffTarget(report, intent.reportId))) throw new MediaError("forbidden");
      const tickets = await issueUploadTickets({
        kind: "report_after",
        ownerId: intent.reportId,
        files: intent.files,
        rateKey: staff.id,
        deviceHash: null,
        uploadedByUserId: staff.id,
      });
      return { ok: true, tickets };
    }

    const staff = await requireStaff({ pet: ["update"] });
    if (!(await staffTarget(pet, intent.petId))) throw new MediaError("forbidden");
    const tickets = await issueUploadTickets({
      kind: "pet_gallery",
      ownerId: intent.petId,
      files: intent.files,
      rateKey: staff.id,
      deviceHash: null,
      uploadedByUserId: staff.id,
    });
    return { ok: true, tickets };
  } catch (error) {
    if (error instanceof MediaError) return { ok: false, error: mediaCopy.errors[error.reason] };
    if (error instanceof DraftError) return { ok: false, error: mediaCopy.errors.expired };
    if (error instanceof StaffAccessError) return { ok: false, error: mediaCopy.errors.forbidden };
    return { ok: false, error: mediaCopy.errors.unavailable };
  }
}

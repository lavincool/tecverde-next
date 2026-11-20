"use server";

import { z } from "zod";

import { errors } from "@/messages/es-MX/errors";
import { draftScopes } from "@/server/security/draft-token";

import { DraftError, startDraftForDevice } from "./drafts";

export type StartDraftResult =
  | { ok: true; draftId: string; draftToken: string }
  | { ok: false; error: string };

const inputSchema = z.object({
  scope: z.enum(draftScopes),
  turnstileToken: z.string().max(2048),
});

export async function startDraft(input: {
  scope: string;
  turnstileToken: string;
}): Promise<StartDraftResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: errors.submissions.challenge_failed };
  try {
    const draft = await startDraftForDevice(parsed.data.scope, parsed.data.turnstileToken);
    return { ok: true, ...draft };
  } catch (error) {
    if (error instanceof DraftError) return { ok: false, error: errors.submissions[error.reason] };
    return { ok: false, error: errors.submissions.unavailable };
  }
}

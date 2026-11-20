import "server-only";

import { v7 } from "uuid";

import { ensureDeviceHash, getRequestIp, requireHashSecret } from "@/server/security/device";
import { issueDraftToken, readDraftToken } from "@/server/security/draft-token";
import { getRateLimiter } from "@/server/security/rate-limit";
import { publicSubmissionsEnabled } from "@/server/security/submissions";
import { verifyTurnstile } from "@/server/security/turnstile";

import type { DraftPayload, DraftScope } from "@/server/security/draft-token";

export class DraftError extends Error {
  constructor(readonly reason: "disabled" | "challenge_failed" | "invalid_draft" | "rate_limited") {
    super(reason);
  }
}

const DRAFT_START_LIMIT = 20;
const DRAFT_START_WINDOW_SECONDS = 600;
const DRAFT_USE_WINDOW_SECONDS = 60 * 60;

/** Verifies a Turnstile solve once and exchanges it for a signed draft bound to this device. */
export async function startDraftForDevice(scope: DraftScope, turnstileToken: string) {
  if (!publicSubmissionsEnabled()) throw new DraftError("disabled");
  const secret = requireHashSecret();
  const deviceHash = await ensureDeviceHash();

  const limit = await getRateLimiter().consume(
    `tecverde:draft:start:${deviceHash}`,
    DRAFT_START_LIMIT,
    DRAFT_START_WINDOW_SECONDS,
  );
  if (!limit.allowed) throw new DraftError("rate_limited");

  const passed = await verifyTurnstile(turnstileToken, {
    action: `${scope}_draft`,
    remoteIp: await getRequestIp(),
  });
  if (!passed) throw new DraftError("challenge_failed");

  const draftId = v7();
  return { draftId, draftToken: issueDraftToken(secret, { draftId, scope, deviceHash }) };
}

/** Reads a draft for this device without consuming it, e.g. to authorize uploads. */
export async function readDraftForDevice(scope: DraftScope, token: string): Promise<DraftPayload> {
  const secret = requireHashSecret();
  const deviceHash = await ensureDeviceHash();
  const payload = readDraftToken(secret, token, { scope, deviceHash });
  if (!payload) throw new DraftError("invalid_draft");
  return payload;
}

/** Consumes a draft so that it authorizes exactly one submission. */
export async function consumeDraftForDevice(
  scope: DraftScope,
  token: string,
): Promise<DraftPayload> {
  if (!publicSubmissionsEnabled()) throw new DraftError("disabled");
  const payload = await readDraftForDevice(scope, token);
  const first = await getRateLimiter().consume(
    `tecverde:draft:used:${payload.draftId}`,
    1,
    DRAFT_USE_WINDOW_SECONDS,
  );
  if (!first.allowed) throw new DraftError("invalid_draft");
  return payload;
}

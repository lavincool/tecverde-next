"use server";

import { after } from "next/server";

import { common } from "@/messages/es-MX/common";
import { db } from "@/server/db";
import { getAppOrigin, getRequestIpHash, requireHashSecret } from "@/server/security/device";
import { getRateLimiter } from "@/server/security/rate-limit";

import { actionTokenSchema } from "./action-tokens";
import { notifyPendingPost, notifyRequestVerified } from "./adoption-updates";
import { applyEmailVerification } from "./verification";

export type ConfirmEmailState = { ok?: true; message?: string; error?: string };

const VERIFY_LIMIT = 20;
const VERIFY_WINDOW_SECONDS = 600;

export async function confirmEmail(token: string): Promise<ConfirmEmailState> {
  if (!actionTokenSchema.safeParse(token).success) return { error: common.verify.invalid };
  try {
    const limit = await getRateLimiter().consume(
      `tecverde:verify:${await getRequestIpHash()}`,
      VERIFY_LIMIT,
      VERIFY_WINDOW_SECONDS,
    );
    if (!limit.allowed) return { error: common.verify.unavailable };
    const outcome = await applyEmailVerification(db, token, requireHashSecret());
    if (!outcome) return { error: common.verify.invalid };
    const origin = await getAppOrigin();
    // No revalidation here: it would refresh this page, which then shows the consumed token
    // as invalid. Staff pages read the queue dynamically on every request.
    if (outcome.purpose === "verify_pet_post") {
      after(() => notifyPendingPost(outcome.subjectId, origin));
    }
    if (outcome.purpose === "verify_adoption_request") {
      after(() => notifyRequestVerified(outcome.subjectId, origin));
    }
    return { ok: true, message: common.verify.done[outcome.purpose] };
  } catch {
    return { error: common.verify.unavailable };
  }
}

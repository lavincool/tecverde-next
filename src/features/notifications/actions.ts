"use server";

import { revalidatePath } from "next/cache";

import { common } from "@/messages/es-MX/common";
import { db } from "@/server/db";
import { getRequestIpHash, requireHashSecret } from "@/server/security/device";
import { getRateLimiter } from "@/server/security/rate-limit";

import { actionTokenSchema } from "./action-tokens";
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
    if (outcome.purpose === "verify_pet_post") revalidatePath("/dashboard/adoption");
    return { ok: true, message: common.verify.done[outcome.purpose] };
  } catch {
    return { error: common.verify.unavailable };
  }
}

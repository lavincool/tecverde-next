import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";

import { actionToken } from "@/server/db/schema/tokens";
import { hashValue, randomToken } from "@/server/security/hash";

import type { connectDatabase } from "@/server/db/connection";
import type { actionTokenPurposes } from "@/server/db/schema/tokens";

type Database = ReturnType<typeof connectDatabase>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type ActionTokenPurpose = (typeof actionTokenPurposes)[number];

export const ACTION_TOKEN_LIFETIME_MS = 48 * 60 * 60 * 1000;
export const actionTokenSchema = z.string().regex(/^[\w-]{43}$/);

export function hashActionToken(secret: string, token: string) {
  return hashValue(secret, "action-token", token);
}

export async function issueActionToken(
  database: Database | Transaction,
  input: { purpose: ActionTokenPurpose; subjectId: string },
  secret: string,
  now = new Date(),
) {
  const token = randomToken();
  await database.insert(actionToken).values({
    purpose: input.purpose,
    subjectId: input.subjectId,
    tokenHash: hashActionToken(secret, token),
    expiresAt: new Date(now.getTime() + ACTION_TOKEN_LIFETIME_MS),
  });
  return token;
}

/** Looks up a pending token without consuming it, so the landing page can describe it. */
export async function peekActionToken(
  database: Database,
  token: string,
  secret: string,
  now = new Date(),
) {
  if (!actionTokenSchema.safeParse(token).success) return null;
  const [row] = await database
    .select({ purpose: actionToken.purpose, subjectId: actionToken.subjectId })
    .from(actionToken)
    .where(
      and(
        eq(actionToken.tokenHash, hashActionToken(secret, token)),
        isNull(actionToken.usedAt),
        gt(actionToken.expiresAt, now),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Atomically marks a token as used and returns what it authorizes. */
export async function consumeActionToken(
  tx: Database | Transaction,
  token: string,
  secret: string,
  now = new Date(),
) {
  if (!actionTokenSchema.safeParse(token).success) return null;
  const [row] = await tx
    .update(actionToken)
    .set({ usedAt: now })
    .where(
      and(
        eq(actionToken.tokenHash, hashActionToken(secret, token)),
        isNull(actionToken.usedAt),
        gt(actionToken.expiresAt, now),
      ),
    )
    .returning({ purpose: actionToken.purpose, subjectId: actionToken.subjectId });
  return row ?? null;
}

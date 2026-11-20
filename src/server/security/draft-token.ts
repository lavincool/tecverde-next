import { z } from "zod";

import { hashValue, randomToken, secureEqual } from "./hash";

export const draftScopes = ["report", "pet"] as const;
export type DraftScope = (typeof draftScopes)[number];

export const DRAFT_LIFETIME_MS = 30 * 60 * 1000;

const payloadSchema = z.object({
  draftId: z.uuidv7(),
  scope: z.enum(draftScopes),
  deviceHash: z.string().min(1),
  exp: z.number().int().positive(),
  nonce: z.string().min(8),
});

export type DraftPayload = z.output<typeof payloadSchema>;

function sign(secret: string, encoded: string) {
  return hashValue(secret, "draft-token", encoded);
}

/** Issues a signed draft token that authorizes uploads and one submission for a single draft. */
export function issueDraftToken(
  secret: string,
  input: { draftId: string; scope: DraftScope; deviceHash: string },
  now = Date.now(),
): string {
  const payload: DraftPayload = {
    ...input,
    exp: now + DRAFT_LIFETIME_MS,
    nonce: randomToken(9),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(secret, encoded)}`;
}

export function readDraftToken(
  secret: string,
  token: string,
  expected: { scope: DraftScope; deviceHash: string },
  now = Date.now(),
): DraftPayload | undefined {
  if (token.length > 1024) return undefined;
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra !== undefined) return undefined;
  if (!secureEqual(signature, sign(secret, encoded))) return undefined;

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
  const parsed = payloadSchema.safeParse(decoded);
  if (!parsed.success) return undefined;
  const payload = parsed.data;
  if (payload.exp <= now) return undefined;
  if (payload.scope !== expected.scope) return undefined;
  if (!secureEqual(payload.deviceHash, expected.deviceHash)) return undefined;
  return payload;
}

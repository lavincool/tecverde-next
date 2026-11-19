import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashValue(secret: string, purpose: string, value: string) {
  return createHmac("sha256", secret)
    .update(purpose)
    .update("\0")
    .update(value)
    .digest("base64url");
}

export function secureEqual(first: string, second: string) {
  const a = Buffer.from(first);
  const b = Buffer.from(second);
  return a.length === b.length && timingSafeEqual(a, b);
}

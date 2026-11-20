import "server-only";

import { connection } from "next/server";

import { db } from "@/server/db";
import { readHashSecret } from "@/server/security/device";

import { peekActionToken } from "./action-tokens";

export async function isPendingActionToken(token: string) {
  await connection();
  const secret = readHashSecret();
  if (!secret) return false;
  try {
    return (await peekActionToken(db, token, secret)) !== null;
  } catch {
    return false;
  }
}

import "server-only";

import { db } from "@/server/db";

import { createStaffAuth, readAuthConfig } from "./config";

let auth: ReturnType<typeof createStaffAuth> | undefined;

export function getAuth() {
  auth ??= createStaffAuth(db, readAuthConfig());
  return auth;
}

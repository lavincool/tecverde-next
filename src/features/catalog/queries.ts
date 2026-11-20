import "server-only";

import { requireStaff } from "@/server/auth/guards";
import { db } from "@/server/db";

import { listFullCatalog } from "./repository";

export async function getCatalogForAdmin() {
  await requireStaff({ catalog: ["manage"] });
  return listFullCatalog(db);
}

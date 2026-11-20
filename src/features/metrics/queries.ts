import "server-only";

import { requireStaff } from "@/server/auth/guards";
import { db } from "@/server/db";

import { loadReportMetrics } from "./repository";

export async function getReportMetrics() {
  await requireStaff({ metrics: ["read"] });
  return loadReportMetrics(db);
}

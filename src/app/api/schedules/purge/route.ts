import { runPurge } from "@/features/retention/jobs";
import { isAuthorizedSchedule, unauthorizedSchedule } from "@/server/security/schedule-auth";

async function run(request: Request) {
  if (!isAuthorizedSchedule(request)) return unauthorizedSchedule();
  return Response.json(await runPurge(), { headers: { "Cache-Control": "no-store" } });
}

export const GET = run;
export const POST = run;

import { cleanupMedia } from "@/features/media/cleanup";
import { isAuthorizedSchedule, unauthorizedSchedule } from "@/server/security/schedule-auth";

async function run(request: Request) {
  if (!isAuthorizedSchedule(request)) return unauthorizedSchedule();
  const result = await cleanupMedia();
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

export const GET = run;
export const POST = run;

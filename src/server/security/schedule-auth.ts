import { secureEqual } from "./hash";

/** Accepts only Vercel schedule invocations that carry the configured CRON_SECRET. */
export function isAuthorizedSchedule(
  request: Request,
  secret: string | undefined = process.env.CRON_SECRET,
) {
  if (!secret || secret.length < 32) return false;
  const header = request.headers.get("authorization") ?? "";
  return secureEqual(header, `Bearer ${secret}`);
}

export function unauthorizedSchedule() {
  return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
}

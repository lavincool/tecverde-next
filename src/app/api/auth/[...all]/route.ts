import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/server/auth/auth";
import { getStaffSession } from "@/server/auth/guards";

const postRoutes = new Set([
  "sign-in/email",
  "sign-out",
  "change-password",
  "two-factor/enable",
  "two-factor/verify-totp",
  "two-factor/verify-backup-code",
  "two-factor/disable",
]);

export async function GET(request: Request, context: RouteContext<"/api/auth/[...all]">) {
  const path = (await context.params).all.join("/");
  if (path !== "get-session") return new Response(null, { status: 404 });
  if (!process.env.BETTER_AUTH_SECRET) return Response.json(null);
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request, context: RouteContext<"/api/auth/[...all]">) {
  const path = (await context.params).all.join("/");
  if (!postRoutes.has(path)) return new Response(null, { status: 404 });
  if (!process.env.BETTER_AUTH_SECRET) return new Response(null, { status: 503 });
  if (["change-password", "two-factor/enable", "two-factor/disable"].includes(path)) {
    const staff = await getStaffSession(request.headers);
    if (!staff) return new Response(null, { status: 401 });
    if (path === "two-factor/disable" && staff.role === "admin") {
      return new Response(null, { status: 403 });
    }
  }
  return toNextJsHandler(getAuth()).POST(request);
}

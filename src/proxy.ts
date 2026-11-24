import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";

import { resolveShortLink } from "@/lib/short-links";
import {
  createDeviceCookie,
  deviceCookieName,
  deviceCookieOptions,
  readDeviceCookie,
} from "@/server/security/device-cookie";

import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const shortLink = resolveShortLink(path, request.nextUrl.search);
  if (shortLink) {
    // Temporary, so printed QR codes can point somewhere else later without stale browser caches.
    return NextResponse.redirect(new URL(shortLink, request.url), 307);
  }
  if (path === "/dashboard" || path.startsWith("/dashboard/")) {
    return getSessionCookie(request)
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();
  const secret = process.env.HASH_SECRET;
  if (
    secret &&
    secret.length >= 32 &&
    !readDeviceCookie(request.cookies.get(deviceCookieName)?.value, secret)
  ) {
    response.cookies.set(deviceCookieName, createDeviceCookie(secret), deviceCookieOptions());
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

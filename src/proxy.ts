import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";

import {
  createDeviceCookie,
  deviceCookieMaxAge,
  deviceCookieName,
  readDeviceCookie,
} from "@/server/security/device-cookie";

import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
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
    response.cookies.set(deviceCookieName, createDeviceCookie(secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: deviceCookieMaxAge,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

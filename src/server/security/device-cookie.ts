import { hashValue, randomToken, secureEqual } from "./hash";

export const deviceCookieName = "tv_device";
export const deviceCookieMaxAge = 400 * 24 * 60 * 60;

export function deviceCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: deviceCookieMaxAge,
  };
}

export function createDeviceCookie(secret: string) {
  const id = randomToken(16);
  return `${id}.${hashValue(secret, "device-cookie", id)}`;
}

export function readDeviceCookie(cookie: string | undefined, secret: string) {
  const match = /^([\w-]{22})\.([\w-]{43})$/.exec(cookie ?? "");
  const id = match?.[1];
  const signature = match?.[2];
  if (id && signature && secureEqual(signature, hashValue(secret, "device-cookie", id))) return id;
  return undefined;
}

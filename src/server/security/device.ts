import "server-only";

import { cookies, headers } from "next/headers";
import { z } from "zod";

import {
  createDeviceCookie,
  deviceCookieName,
  deviceCookieOptions,
  readDeviceCookie,
} from "./device-cookie";
import { hashValue } from "./hash";

const hashSecretSchema = z.string().min(32);

export function readHashSecret(): string | undefined {
  const parsed = hashSecretSchema.safeParse(process.env.HASH_SECRET);
  return parsed.success ? parsed.data : undefined;
}

export function requireHashSecret(): string {
  return hashSecretSchema.parse(process.env.HASH_SECRET);
}

export async function getDeviceHash(): Promise<string | undefined> {
  const secret = readHashSecret();
  if (!secret) return undefined;
  const raw = (await cookies()).get(deviceCookieName)?.value;
  const id = readDeviceCookie(raw, secret);
  return id ? hashValue(secret, "device-id", id) : undefined;
}

export async function ensureDeviceHash(): Promise<string> {
  const secret = requireHashSecret();
  const cookieStore = await cookies();
  const existingId = readDeviceCookie(cookieStore.get(deviceCookieName)?.value, secret);
  if (existingId) return hashValue(secret, "device-id", existingId);

  const signed = createDeviceCookie(secret);
  const createdId = readDeviceCookie(signed, secret);
  if (!createdId) throw new Error("Failed to create a valid device cookie.");

  cookieStore.set(deviceCookieName, signed, deviceCookieOptions());
  return hashValue(secret, "device-id", createdId);
}

function firstForwardedValue(headerValue: string | null): string | undefined {
  const first = headerValue?.split(",")[0]?.trim();
  return first || undefined;
}

export async function getRequestIpHash(): Promise<string> {
  const secret = requireHashSecret();
  const requestHeaders = await headers();
  const ip = process.env.VERCEL
    ? (firstForwardedValue(requestHeaders.get("x-vercel-forwarded-for")) ?? "unknown")
    : (firstForwardedValue(requestHeaders.get("x-forwarded-for")) ??
      firstForwardedValue(requestHeaders.get("x-real-ip")) ??
      "unknown");
  return hashValue(secret, "report-ip", ip);
}

function parseHttpOrigin(candidate: string | undefined): string | undefined {
  if (!candidate) return undefined;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.origin;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function getAppOrigin(): Promise<string> {
  const configured = parseHttpOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;

  const vercelOrigin = process.env.VERCEL_URL
    ? parseHttpOrigin(`https://${process.env.VERCEL_URL}`)
    : undefined;
  if (vercelOrigin) return vercelOrigin;

  const requestHeaders = await headers();
  const host =
    firstForwardedValue(requestHeaders.get("x-forwarded-host")) ??
    firstForwardedValue(requestHeaders.get("host"));
  if (host) {
    const proto = firstForwardedValue(requestHeaders.get("x-forwarded-proto")) ?? "http";
    const headerOrigin = parseHttpOrigin(`${proto}://${host}`);
    if (headerOrigin) return headerOrigin;
  }

  return "http://localhost:3000";
}

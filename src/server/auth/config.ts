import { Redis } from "@upstash/redis";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";
import { v7 } from "uuid";
import { z } from "zod";

import * as schema from "@/server/db/schema/auth";

import { accessControl, roles } from "./permissions";

import type { connectDatabase } from "@/server/db/connection";

type Database = ReturnType<typeof connectDatabase>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const authEnv = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }).optional(),
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

export function readAuthConfig() {
  const env = authEnv.parse({
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || undefined,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || undefined,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
  });
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  const redis =
    url && token ? new Redis({ url, token, automaticDeserialization: false }) : undefined;
  if (!redis && (process.env.VERCEL || url || token))
    throw new Error("Configure both Upstash Redis credentials.");

  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL:
      env.BETTER_AUTH_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
    ...(redis ? { redis } : {}),
    secure: Boolean(process.env.VERCEL) || env.BETTER_AUTH_URL?.startsWith("https://") === true,
  };
}

export function createStaffAuth(
  database: Database | Transaction,
  settings: ReturnType<typeof readAuthConfig>,
) {
  const { redis } = settings;

  return betterAuth({
    appName: "TecVerde",
    baseURL: settings.baseURL,
    secret: settings.secret,
    database: drizzleAdapter(database, { provider: "sqlite", schema, transaction: false }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
    advanced: {
      database: { generateId: () => v7() },
      useSecureCookies: settings.secure,
      ...(process.env.VERCEL
        ? { ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for"] } }
        : {}),
    },
    session: {
      storeSessionInDatabase: true,
      additionalFields: {
        mfaVerified: { type: "boolean", required: true, defaultValue: false, input: false },
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: (session, context) =>
            Promise.resolve({
              data: {
                ...session,
                mfaVerified:
                  context?.path === "/two-factor/verify-totp" ||
                  context?.path === "/two-factor/verify-backup-code",
              },
            }),
        },
      },
    },
    ...(redis
      ? {
          secondaryStorage: {
            get: (key: string) => redis.get<string>(`tecverde:auth:${key}`),
            getAndDelete: (key: string) => redis.getdel<string>(`tecverde:auth:${key}`),
            increment: (key: string, ttl: number) =>
              redis.eval<[number], number>(
                "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return n",
                [`tecverde:auth:${key}`],
                [ttl],
              ),
            set: async (key: string, value: string, ttl?: number) => {
              const name = `tecverde:auth:${key}`;
              await (ttl ? redis.set(name, value, { ex: ttl }) : redis.set(name, value));
            },
            delete: async (key: string) => {
              await redis.del(`tecverde:auth:${key}`);
            },
          },
        }
      : {}),
    rateLimit: {
      enabled: true,
      storage: redis ? "secondary-storage" : "memory",
      customRules: { "/sign-in/email": { window: 60, max: 5 } },
    },
    plugins: [
      admin({ ac: accessControl, roles, defaultRole: "maintenance" }),
      twoFactor(),
      nextCookies(),
    ],
  });
}

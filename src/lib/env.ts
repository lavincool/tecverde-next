import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const secret = z.string().min(32);
const flag = z.enum(["true", "false"]);

/**
 * Validates configuration at build and startup. Service credentials stay optional here
 * because CI builds run without them; each server module fails closed on Vercel when the
 * credentials it needs are missing.
 */
export const env = createEnv({
  server: {
    TURSO_DATABASE_URL: z.url({ protocol: /^(https?|libsql|file)$/ }).optional(),
    TURSO_AUTH_TOKEN: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: secret.optional(),
    BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }).optional(),
    HASH_SECRET: secret.optional(),
    KV_REST_API_URL: z.url().optional(),
    KV_REST_API_TOKEN: z.string().min(1).optional(),
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
    PUBLIC_SUBMISSIONS_ENABLED: flag.default("true"),
    EMAIL_TRANSPORT: z.enum(["resend", "console", "memory"]).optional(),
    RESEND_API_KEY: z.string().startsWith("re_").optional(),
    EMAIL_FROM: z.string().min(3).optional(),
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_PUBLIC_BUCKET: z.string().min(1).optional(),
    R2_PRIVATE_BUCKET: z.string().min(1).optional(),
    VAPID_PRIVATE_KEY: z.string().min(1).optional(),
    VAPID_SUBJECT: z.string().min(1).optional(),
    CRON_SECRET: secret.optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url({ protocol: /^https?$/ }).optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_MEDIA_BASE_URL: z.url({ protocol: /^https$/ }).optional(),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_MEDIA_BASE_URL: process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
});

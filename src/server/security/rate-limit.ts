import { Redis } from "@upstash/redis";
import { z } from "zod";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
};

export type RateLimiter = {
  consume: (key: string, limit: number, windowSeconds: number) => Promise<RateLimitResult>;
};

const kvEnvSchema = z.object({
  KV_REST_API_URL: z.url().optional(),
  KV_REST_API_TOKEN: z.string().min(1).optional(),
});

const incrementWindowScript =
  "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return n";

export function createRateLimiter(options?: { redis?: Redis; now?: () => number }): RateLimiter {
  const redis = options?.redis;
  if (redis) {
    return {
      async consume(key, limit, windowSeconds) {
        const count = await redis.eval<[number], number>(
          incrementWindowScript,
          [key],
          [windowSeconds],
        );
        return {
          allowed: count <= limit,
          remaining: Math.max(0, limit - count),
        };
      },
    };
  }

  const now = options?.now ?? Date.now;
  const store = new Map<string, { count: number; expiresAt: number }>();

  return {
    consume(key, limit, windowSeconds) {
      const currentTime = now();
      for (const [entryKey, entry] of store) {
        if (entry.expiresAt <= currentTime) {
          store.delete(entryKey);
        }
      }

      const existing = store.get(key);
      const count = existing ? existing.count + 1 : 1;
      const expiresAt = existing ? existing.expiresAt : currentTime + windowSeconds * 1000;
      store.set(key, { count, expiresAt });

      return Promise.resolve({
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
      });
    },
  };
}

let defaultRateLimiter: RateLimiter | undefined;

export function getRateLimiter(): RateLimiter {
  if (defaultRateLimiter) return defaultRateLimiter;

  const env = kvEnvSchema.parse({
    KV_REST_API_URL: process.env.KV_REST_API_URL || undefined,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN || undefined,
  });

  const url = env.KV_REST_API_URL;
  const token = env.KV_REST_API_TOKEN;
  const redis =
    url && token ? new Redis({ url, token, automaticDeserialization: false }) : undefined;

  if (!redis && (process.env.VERCEL || url || token)) {
    throw new Error("Configure both Upstash Redis credentials.");
  }

  defaultRateLimiter = createRateLimiter(redis ? { redis } : undefined);
  return defaultRateLimiter;
}

import { describe, expect, test } from "bun:test";

import { createRateLimiter } from "./rate-limit";

describe("rate limiter", () => {
  test("allows requests up to the limit and blocks subsequent ones within the window", async () => {
    let time = 1_000_000;
    const limiter = createRateLimiter({ now: () => time });

    expect(await limiter.consume("device:1", 3, 60)).toEqual({ allowed: true, remaining: 2 });
    expect(await limiter.consume("device:1", 3, 60)).toEqual({ allowed: true, remaining: 1 });
    expect(await limiter.consume("device:1", 3, 60)).toEqual({ allowed: true, remaining: 0 });
    expect(await limiter.consume("device:1", 3, 60)).toEqual({ allowed: false, remaining: 0 });

    // Other keys remain isolated.
    expect(await limiter.consume("device:2", 3, 60)).toEqual({ allowed: true, remaining: 2 });

    // Advancing slightly before window expiry keeps the block active.
    time += 59_999;
    expect(await limiter.consume("device:1", 3, 60)).toEqual({ allowed: false, remaining: 0 });

    // Once the window elapses, the counter resets.
    time += 1;
    expect(await limiter.consume("device:1", 3, 60)).toEqual({ allowed: true, remaining: 2 });
  });
});

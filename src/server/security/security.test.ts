import { describe, expect, test } from "bun:test";
import { v7 } from "uuid";

import { DRAFT_LIFETIME_MS, issueDraftToken, readDraftToken } from "./draft-token";
import { publicSubmissionsEnabled } from "./submissions";
import { readTurnstileConfig, verifyTurnstile } from "./turnstile";

import type { Fetcher } from "./turnstile";

const secret = "tx-test-draft-secret-with-no-production-access";

describe("draft tokens", () => {
  const draftId = v7();
  const now = 1_800_000_000_000;
  const token = issueDraftToken(secret, { draftId, scope: "report", deviceHash: "device-a" }, now);

  test("round-trips for the same scope and device before expiry", () => {
    expect(
      readDraftToken(secret, token, { scope: "report", deviceHash: "device-a" }, now + 1),
    ).toMatchObject({
      draftId,
      scope: "report",
      deviceHash: "device-a",
      exp: now + DRAFT_LIFETIME_MS,
    });
  });

  test("rejects expiry, another scope, another device, another secret and tampering", () => {
    const expected = { scope: "report", deviceHash: "device-a" } as const;
    expect(readDraftToken(secret, token, expected, now + DRAFT_LIFETIME_MS)).toBeUndefined();
    expect(readDraftToken(secret, token, { ...expected, scope: "pet" }, now)).toBeUndefined();
    expect(
      readDraftToken(secret, token, { ...expected, deviceHash: "device-b" }, now),
    ).toBeUndefined();
    expect(readDraftToken(`${secret}-other`, token, expected, now)).toBeUndefined();

    const [encoded, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(encoded ?? "", "base64url").toString()),
        exp: now + 10 * DRAFT_LIFETIME_MS,
      }),
    ).toString("base64url");
    expect(readDraftToken(secret, `${forged}.${signature}`, expected, now)).toBeUndefined();
    expect(readDraftToken(secret, `${token}.extra`, expected, now)).toBeUndefined();
    expect(readDraftToken(secret, "", expected, now)).toBeUndefined();
  });
});

function fakeSiteverify(body: unknown, status = 200) {
  const calls: FormData[] = [];
  const fetcher: Fetcher = (_, init) => {
    if (init.body instanceof FormData) calls.push(init.body);
    return Promise.resolve(Response.json(body, { status }));
  };
  return { fetcher, calls };
}

describe("turnstile", () => {
  const config = { secretKey: "test-secret", hostnames: ["tecverde.example"], required: true };

  test("accepts a successful response for the expected action and hostname", async () => {
    const { fetcher, calls } = fakeSiteverify({
      success: true,
      action: "report_draft",
      hostname: "tecverde.example",
    });
    expect(
      await verifyTurnstile("token", {
        action: "report_draft",
        remoteIp: "1.2.3.4",
        config,
        fetcher,
      }),
    ).toBe(true);
    expect(calls[0]?.get("secret")).toBe("test-secret");
    expect(calls[0]?.get("response")).toBe("token");
    expect(calls[0]?.get("remoteip")).toBe("1.2.3.4");
  });

  test("rejects failures, mismatched actions or hostnames and empty tokens", async () => {
    const options = { action: "report_draft", config };
    expect(
      await verifyTurnstile("token", { ...options, ...fakeSiteverify({ success: false }) }),
    ).toBe(false);
    expect(
      await verifyTurnstile("token", {
        ...options,
        ...fakeSiteverify({ success: true, action: "pet_draft" }),
      }),
    ).toBe(false);
    expect(
      await verifyTurnstile("token", {
        ...options,
        ...fakeSiteverify({ success: true, hostname: "evil.example" }),
      }),
    ).toBe(false);
    expect(await verifyTurnstile("token", { ...options, ...fakeSiteverify({}, 500) })).toBe(false);
    expect(await verifyTurnstile("", { ...options, ...fakeSiteverify({ success: true }) })).toBe(
      false,
    );
  });

  test("skips verification without a secret only outside production", async () => {
    const options = { action: "report_draft" };
    expect(
      await verifyTurnstile("", {
        ...options,
        config: { ...config, secretKey: undefined, required: false },
      }),
    ).toBe(true);
    expect(
      await verifyTurnstile("", {
        ...options,
        config: { ...config, secretKey: undefined, required: true },
      }),
    ).toBe(false);
    expect(
      readTurnstileConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_APP_URL: "https://a.example" }),
    ).toEqual({
      secretKey: undefined,
      hostnames: ["a.example"],
      required: true,
    });
  });
});

test("the kill switch closes public submissions only when set to false", () => {
  expect(publicSubmissionsEnabled({})).toBe(true);
  expect(publicSubmissionsEnabled({ PUBLIC_SUBMISSIONS_ENABLED: "true" })).toBe(true);
  expect(publicSubmissionsEnabled({ PUBLIC_SUBMISSIONS_ENABLED: "false" })).toBe(false);
});

import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { createHmac } from "node:crypto";
import { z } from "zod";

import { createStaffAuth } from "@/server/auth/config";
import { connectDatabase } from "@/server/db/connection";
import { auditLog, session, staffInvite, user } from "@/server/db/schema";
import { createDeviceCookie, readDeviceCookie } from "@/server/security/device-cookie";
import { hashValue } from "@/server/security/hash";

import { migrateDatabase } from "../../../scripts/db-migrate";
import { issueInvite, redeemInvite } from "./invites";

const authConfig = {
  secret: "tx-test-staff-auth-with-no-production-access",
  baseURL: "http://localhost:3200",
  secure: false,
};
const inviteSecret = "tx-test-device-and-invite-secret-with-no-production-access";
const password = "Local-integration-password";

function currentTotp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const character of secret.replace(/=+$/, "").toUpperCase()) {
    buffer = (buffer << 5) | alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", Uint8Array.from(bytes)).update(counter).digest();
  const offset = digest.readUInt8(digest.length - 1) & 0xf;
  const code = (digest.readUInt32BE(offset) & 0x7fff_ffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

async function withDatabase(run: (database: ReturnType<typeof connectDatabase>) => Promise<void>) {
  const database = connectDatabase({ url: "file::memory:" });
  try {
    await migrateDatabase(database);
    await run(database);
  } finally {
    database.$client.close();
  }
}

describe("staff invites and auth", () => {
  test("redeems once and signs in a bootstrapped admin with the invite password", async () => {
    await withDatabase(async (database) => {
      const email = "admin@example.test";
      const token = await issueInvite(
        database,
        { email, role: "admin", actorId: null },
        inviteSecret,
      );
      const draft = { token, name: "Administradora", password };

      const id = await redeemInvite(database, draft, inviteSecret, authConfig);
      expect(
        await redeemInvite(database, draft, inviteSecret, authConfig).catch(
          (error: unknown) => error,
        ),
      ).toHaveProperty("reason", "invite_invalid");
      expect(
        await issueInvite(
          database,
          { email: "another@example.test", role: "admin", actorId: null },
          inviteSecret,
        ).catch((error: unknown) => error),
      ).toHaveProperty("reason", "already_bootstrapped");
      expect(await database.select({ action: auditLog.action }).from(auditLog)).toHaveLength(2);

      const auth = createStaffAuth(database, authConfig);
      const login = await auth.api.signInEmail({ body: { email, password } });
      expect(login.user.id).toBe(id);
      expect((await database.select().from(user).where(eq(user.id, id)))[0]?.role).toBe("admin");

      const signup = await auth.handler(
        new Request(`${authConfig.baseURL}/api/auth/sign-up/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: authConfig.baseURL },
          body: JSON.stringify({ email: "anonymous@example.test", name: "Visitor", password }),
        }),
      );
      expect(signup.ok).toBe(false);
    });
  });

  test("only a verified two-factor session grants an enrolled admin session assurance", async () => {
    await withDatabase(async (database) => {
      const email = "twofactor@example.test";
      const auth = createStaffAuth(database, authConfig);
      await auth.api.createUser({ body: { email, name: "Admin", role: "admin", password } });

      function post(path: string, body: object, cookie?: string) {
        const headers = new Headers({
          "Content-Type": "application/json",
          Origin: authConfig.baseURL,
        });
        if (cookie) headers.set("Cookie", cookie);
        return auth.handler(
          new Request(`${authConfig.baseURL}/api/auth/${path}`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          }),
        );
      }
      const login = await post("sign-in/email", { email, password });
      expect(login.ok).toBe(true);
      const passwordSession = login.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      const setup = await post("two-factor/enable", { password, method: "totp" }, passwordSession);
      expect(setup.ok).toBe(true);
      const { totpURI } = z.object({ totpURI: z.string() }).parse(await setup.json());
      const secret = new URL(totpURI).searchParams.get("secret");
      if (!secret) throw new Error("Expected a TOTP secret.");

      const extraLogin = await post("sign-in/email", { email, password });
      expect(extraLogin.ok).toBe(true);
      const code = currentTotp(secret);
      const enrolled = await post("two-factor/verify-totp", { code }, passwordSession);
      if (!enrolled.ok) throw new Error(await enrolled.text());
      const enrollmentSessions = await database
        .select({ verified: session.mfaVerified })
        .from(session);
      expect(enrollmentSessions.some(({ verified }) => verified)).toBe(true);
      expect(enrollmentSessions.some(({ verified }) => !verified)).toBe(true);

      const signIn = await post("sign-in/email", { email, password });
      expect(await signIn.json()).toHaveProperty("twoFactorRedirect", true);
      const challenge = signIn.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      const verified = await post("two-factor/verify-totp", { code }, challenge);
      if (!verified.ok) throw new Error(await verified.text());
      const verifiedSession = verified.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      expect(
        (await auth.api.getSession({ headers: new Headers({ Cookie: verifiedSession }) }))?.session
          .mfaVerified,
      ).toBe(true);
    });
  });

  test("expires and revokes invites without creating staff", async () => {
    await withDatabase(async (database) => {
      const token = await issueInvite(
        database,
        { email: "expired@example.test", role: "admin", actorId: null },
        inviteSecret,
      );
      await database.update(staffInvite).set({ expiresAt: new Date(0) });
      expect(
        await redeemInvite(
          database,
          { token, name: "Staff", password },
          inviteSecret,
          authConfig,
        ).catch((error: unknown) => error),
      ).toHaveProperty("reason", "invite_invalid");

      const nextToken = await issueInvite(
        database,
        { email: "revoked@example.test", role: "admin", actorId: null },
        inviteSecret,
      );
      await database.update(staffInvite).set({ revokedAt: new Date() });
      expect(
        await redeemInvite(
          database,
          { token: nextToken, name: "Staff", password },
          inviteSecret,
          authConfig,
        ).catch((error: unknown) => error),
      ).toHaveProperty("reason", "invite_invalid");
      expect(await database.select().from(user)).toEqual([]);
    });
  });

  test("Better Auth applies the maintenance and moderator permission boundaries", async () => {
    await withDatabase(async (database) => {
      const auth = createStaffAuth(database, authConfig);
      const maintenance = await auth.api.createUser({
        body: { name: "Maintenance", email: "maintenance@example.test", role: "maintenance" },
      });
      const moderator = await auth.api.createUser({
        body: { name: "Moderator", email: "moderator@example.test", role: "moderator" },
      });

      expect(
        (
          await auth.api.userHasPermission({
            body: { userId: maintenance.user.id, permissions: { report: ["triage"] } },
          })
        ).success,
      ).toBe(true);
      expect(
        (
          await auth.api.userHasPermission({
            body: { userId: maintenance.user.id, permissions: { pet: ["moderate"] } },
          })
        ).success,
      ).toBe(false);
      expect(
        (
          await auth.api.userHasPermission({
            body: { userId: moderator.user.id, permissions: { report: ["triage"] } },
          })
        ).success,
      ).toBe(false);
    });
  });
});

test("device cookies authenticate the opaque id and reject alteration", () => {
  const signed = createDeviceCookie(inviteSecret);
  const id = readDeviceCookie(signed, inviteSecret);
  expect(id).toMatch(/^[\w-]{22}$/);
  if (!id) throw new Error("Expected a signed device ID.");
  expect(readDeviceCookie(signed, "another-key")).toBeUndefined();
  const altered = `${signed.startsWith("a") ? "b" : "a"}${signed.slice(1)}`;
  expect(readDeviceCookie(altered, inviteSecret)).toBeUndefined();
  expect(hashValue(inviteSecret, "device-id", id)).not.toBe(
    hashValue(inviteSecret, "device-cookie", id),
  );
});

import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";

import { createStaffAuth } from "@/server/auth/config";
import { user } from "@/server/db/schema/auth";
import { auditLog, staffInvite } from "@/server/db/schema/staff";
import { hashValue, randomToken } from "@/server/security/hash";

import type { StaffRole } from "./enums";
import type { readAuthConfig } from "@/server/auth/config";
import type { connectDatabase } from "@/server/db/connection";

type Database = ReturnType<typeof connectDatabase>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const inviteLifetime = 72 * 60 * 60 * 1000;

export const inviteTokenSchema = z.string().regex(/^[\w-]{43}$/);
export const staffEmailSchema = z
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(12).max(128);

export class StaffMutationError extends Error {
  constructor(
    readonly reason:
      | "invite_invalid"
      | "existing_staff"
      | "already_bootstrapped"
      | "actor_forbidden"
      | "target_forbidden",
  ) {
    super(reason);
  }
}

export async function assertStaffManager(tx: Transaction, actorId: string) {
  const [actor] = await tx.select().from(user).where(eq(user.id, actorId)).limit(1);
  if (actor?.role !== "admin" || actor.twoFactorEnabled !== true || actor.banned) {
    throw new StaffMutationError("actor_forbidden");
  }
}

export function inviteSecret() {
  return z.string().min(32).parse(process.env.HASH_SECRET);
}

export async function issueInvite(
  database: Database,
  input: { email: string; role: StaffRole; actorId: string | null },
  secret: string,
) {
  const token = randomToken();
  const now = new Date();

  return database.transaction(
    async (tx) => {
      if (input.actorId) {
        await assertStaffManager(tx, input.actorId);
      } else {
        const [admin] = await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.role, "admin"))
          .limit(1);
        if (admin || input.role !== "admin") throw new StaffMutationError("already_bootstrapped");
        const [activeInvite] = await tx
          .select({ id: staffInvite.id })
          .from(staffInvite)
          .where(
            and(
              isNull(staffInvite.invitedByUserId),
              isNull(staffInvite.acceptedAt),
              isNull(staffInvite.revokedAt),
              gt(staffInvite.expiresAt, now),
            ),
          )
          .limit(1);
        if (activeInvite) throw new StaffMutationError("already_bootstrapped");
      }

      const [existing] = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, input.email))
        .limit(1);
      if (existing) throw new StaffMutationError("existing_staff");

      await tx
        .update(staffInvite)
        .set({ revokedAt: now })
        .where(
          and(
            eq(staffInvite.email, input.email),
            isNull(staffInvite.acceptedAt),
            isNull(staffInvite.revokedAt),
            gt(staffInvite.expiresAt, now),
          ),
        );
      const [invite] = await tx
        .insert(staffInvite)
        .values({
          email: input.email,
          role: input.role,
          tokenHash: hashValue(secret, "staff-invite", token),
          invitedByUserId: input.actorId,
          expiresAt: new Date(now.getTime() + inviteLifetime),
        })
        .returning({ id: staffInvite.id });
      if (!invite) throw new Error("Staff invite insertion failed.");

      await tx.insert(auditLog).values({
        actorUserId: input.actorId,
        action: "staff.invite",
        entityType: "staff_invite",
        entityId: invite.id,
        metadata: { role: input.role },
      });
      return token;
    },
    { behavior: "immediate" },
  );
}

export async function redeemInvite(
  database: Database,
  input: { token: string; name: string; password: string },
  secret: string,
  authConfig: ReturnType<typeof readAuthConfig>,
) {
  const now = new Date();
  return database.transaction(
    async (tx) => {
      const [invite] = await tx
        .update(staffInvite)
        .set({ acceptedAt: now })
        .where(
          and(
            eq(staffInvite.tokenHash, hashValue(secret, "staff-invite", input.token)),
            isNull(staffInvite.acceptedAt),
            isNull(staffInvite.revokedAt),
            gt(staffInvite.expiresAt, now),
          ),
        )
        .returning({ id: staffInvite.id, email: staffInvite.email, role: staffInvite.role });
      if (!invite) throw new StaffMutationError("invite_invalid");

      const auth = createStaffAuth(tx, authConfig);
      const account = await auth.api.createUser({
        body: {
          email: invite.email,
          name: input.name,
          password: input.password,
          role: invite.role,
        },
      });
      await tx.insert(auditLog).values({
        actorUserId: account.user.id,
        action: "staff.accept_invite",
        entityType: "staff_invite",
        entityId: invite.id,
        metadata: { role: invite.role },
      });
      return account.user.id;
    },
    { behavior: "immediate" },
  );
}

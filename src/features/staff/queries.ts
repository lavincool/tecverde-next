import "server-only";

import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { connection } from "next/server";

import { requireStaff } from "@/server/auth/guards";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import { auditLog, staffInvite } from "@/server/db/schema/staff";
import { hashValue } from "@/server/security/hash";

import { inviteSecret, inviteTokenSchema } from "./invites";

export async function getInvite(token: string) {
  if (!inviteTokenSchema.safeParse(token).success || !process.env.HASH_SECRET) return null;
  await connection();
  const [invite] = await db
    .select({ email: staffInvite.email, role: staffInvite.role })
    .from(staffInvite)
    .where(
      and(
        eq(staffInvite.tokenHash, hashValue(inviteSecret(), "staff-invite", token)),
        isNull(staffInvite.acceptedAt),
        isNull(staffInvite.revokedAt),
        gt(staffInvite.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return invite ?? null;
}

export async function getStaffDirectory() {
  const actor = await requireStaff({ staff: ["invite", "set_role", "ban"] });
  const now = new Date();
  const [users, invites, events] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        twoFactorEnabled: user.twoFactorEnabled,
      })
      .from(user)
      .orderBy(user.name),
    db
      .select({
        id: staffInvite.id,
        email: staffInvite.email,
        role: staffInvite.role,
        expiresAt: staffInvite.expiresAt,
      })
      .from(staffInvite)
      .where(
        and(
          isNull(staffInvite.acceptedAt),
          isNull(staffInvite.revokedAt),
          gt(staffInvite.expiresAt, now),
        ),
      )
      .orderBy(desc(staffInvite.createdAt))
      .limit(100),
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        actor: user.name,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorUserId))
      .where(or(eq(auditLog.entityType, "staff_invite"), eq(auditLog.entityType, "staff")))
      .orderBy(desc(auditLog.createdAt))
      .limit(30),
  ]);
  return { actor, users, invites, events };
}

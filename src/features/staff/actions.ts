"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dashboard } from "@/messages/es-MX/dashboard";
import { readAuthConfig } from "@/server/auth/config";
import { requireStaff, StaffAccessError } from "@/server/auth/guards";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import { auditLog, staffInvite } from "@/server/db/schema/staff";

import { staffRoles } from "./enums";
import {
  assertStaffManager,
  inviteSecret,
  inviteTokenSchema,
  issueInvite,
  passwordSchema,
  redeemInvite,
  staffEmailSchema,
  StaffMutationError,
} from "./invites";

type ActionResult = { ok?: true; error?: string; link?: string; status?: 400 | 401 | 403 | 500 };
const roleSchema = z.enum(staffRoles);
const idSchema = z.uuidv7();

function failure(error: unknown): ActionResult {
  if (error instanceof StaffAccessError)
    return {
      error: error.status === 401 ? dashboard.staff.signInAgain : dashboard.staff.forbidden,
      status: error.status,
    };
  if (error instanceof StaffMutationError)
    return { error: dashboard.staff.failures[error.reason], status: 400 };
  return { error: dashboard.login.unavailable, status: 500 };
}

export async function createStaffInvite(_: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const actor = await requireStaff({ staff: ["invite"] });
    const parsed = z.object({ email: staffEmailSchema, role: roleSchema }).safeParse({
      email: form.get("email"),
      role: form.get("role"),
    });
    if (!parsed.success) return { error: dashboard.staff.invalidFields, status: 400 };
    const config = readAuthConfig();
    const token = await issueInvite(db, { ...parsed.data, actorId: actor.id }, inviteSecret());
    revalidatePath("/dashboard/staff");
    return { ok: true, link: new URL(`/invite/${token}`, config.baseURL).href };
  } catch (error) {
    return failure(error);
  }
}

export async function acceptInvite(
  token: string,
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const parsed = z
    .object({
      token: inviteTokenSchema,
      name: z.string().trim().min(1).max(100),
      password: passwordSchema,
    })
    .safeParse({ token, name: form.get("name"), password: form.get("password") });
  if (!parsed.success) return { error: dashboard.staff.invalidFields, status: 400 };

  try {
    await redeemInvite(db, parsed.data, inviteSecret(), readAuthConfig());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function revokeStaffInvite(_: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const actor = await requireStaff({ staff: ["invite"] });
    const id = idSchema.parse(form.get("id"));
    const now = new Date();
    await db.transaction(
      async (tx) => {
        await assertStaffManager(tx, actor.id);
        const [invite] = await tx
          .update(staffInvite)
          .set({ revokedAt: now })
          .where(
            and(
              eq(staffInvite.id, id),
              isNull(staffInvite.acceptedAt),
              isNull(staffInvite.revokedAt),
              gt(staffInvite.expiresAt, now),
            ),
          )
          .returning({ id: staffInvite.id });
        if (!invite) throw new StaffMutationError("invite_invalid");
        await tx.insert(auditLog).values({
          actorUserId: actor.id,
          action: "staff.revoke_invite",
          entityType: "staff_invite",
          entityId: invite.id,
        });
      },
      { behavior: "immediate" },
    );
    revalidatePath("/dashboard/staff");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateStaffAccount(_: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const actor = await requireStaff({ staff: ["ban", "set_role"] });
    const parsed = z.object({ id: idSchema, role: roleSchema, banned: z.boolean() }).safeParse({
      id: form.get("id"),
      role: form.get("role"),
      banned: form.get("banned") === "on",
    });
    if (!parsed.success) return { error: dashboard.staff.invalidFields, status: 400 };
    if (parsed.data.id === actor.id) throw new StaffMutationError("target_forbidden");
    const { id, role, banned } = parsed.data;
    await db.transaction(
      async (tx) => {
        await assertStaffManager(tx, actor.id);
        const [target] = await tx
          .update(user)
          .set({ role, banned, banExpires: null })
          .where(eq(user.id, id))
          .returning({ id: user.id });
        if (!target) throw new StaffMutationError("target_forbidden");
        await tx.insert(auditLog).values({
          actorUserId: actor.id,
          action: "staff.update_account",
          entityType: "staff",
          entityId: target.id,
          metadata: { role, banned },
        });
      },
      { behavior: "immediate" },
    );
    revalidatePath("/dashboard/staff");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

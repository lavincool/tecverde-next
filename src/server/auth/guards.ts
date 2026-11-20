import "server-only";

import { and, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { db } from "@/server/db";
import { session as sessionTable, user } from "@/server/db/schema/auth";

import { getAuth } from "./auth";
import { hasStaffPermission, isStaffRole } from "./permissions";

import type { StaffPermission } from "./permissions";

export class StaffAccessError extends Error {
  constructor(
    readonly status: 401 | 403,
    readonly needsTwoFactor = false,
  ) {
    super("Staff authorization failed");
  }
}

export async function getStaffSession(requestHeaders: Headers) {
  if (!process.env.BETTER_AUTH_SECRET) return null;
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;

  const [record] = await db
    .select({ staff: user, mfaVerified: sessionTable.mfaVerified })
    .from(user)
    .innerJoin(sessionTable, eq(sessionTable.userId, user.id))
    .where(
      and(
        eq(user.id, session.user.id),
        eq(sessionTable.id, session.session.id),
        gt(sessionTable.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const staff = record?.staff;
  if (!staff?.role || !isStaffRole(staff.role)) return null;
  if (staff.banned && (!staff.banExpires || staff.banExpires > new Date())) return null;
  if (staff.role === "admin" && staff.twoFactorEnabled && !record?.mfaVerified) return null;

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    twoFactorEnabled: staff.twoFactorEnabled === true,
  };
}

export async function requireStaff(permission?: StaffPermission, allowEnrollment = false) {
  const staff = await getStaffSession(await headers());
  if (!staff) throw new StaffAccessError(401);
  if (staff.role === "admin" && !staff.twoFactorEnabled && !allowEnrollment) {
    throw new StaffAccessError(403, true);
  }
  if (permission && !hasStaffPermission(staff.role, permission)) throw new StaffAccessError(403);
  return staff;
}

/** Maps a staff authorization failure to the matching navigation for a page render. */
export function handleStaffPageError(error: unknown): never {
  if (!(error instanceof StaffAccessError)) throw error;
  if (error.status === 401) redirect("/login");
  if (error.needsTwoFactor) redirect("/dashboard/settings");
  notFound();
}

export async function requireStaffPage(permission?: StaffPermission, allowEnrollment = false) {
  try {
    return await requireStaff(permission, allowEnrollment);
  } catch (error) {
    return handleStaffPageError(error);
  }
}

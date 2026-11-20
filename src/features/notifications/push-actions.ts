"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { requireStaff } from "@/server/auth/guards";
import { hasStaffPermission } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { pushSubscription } from "@/server/db/schema/push";
import { isPushConfigured } from "@/server/push/web-push";
import { ensureDeviceHash, getDeviceHash } from "@/server/security/device";
import { getRateLimiter } from "@/server/security/rate-limit";

import { upsertSubscription } from "./push-repository";

import type { PushTopic } from "@/server/db/schema/push";

const base64url = z
  .string()
  .regex(/^[\w-]+={0,2}$/)
  .max(256);
const subscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1024),
  keys: z.object({ p256dh: base64url, auth: base64url }),
  audience: z.enum(["device", "staff"]),
});

export type PushSubscriptionInput = z.input<typeof subscriptionSchema>;

export async function savePushSubscription(input: PushSubscriptionInput): Promise<{ ok: boolean }> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success || !isPushConfigured()) return { ok: false };
  try {
    const { endpoint, keys, audience } = parsed.data;
    if (audience === "staff") {
      const staff = await requireStaff();
      const topics: PushTopic[] = [];
      if (hasStaffPermission(staff.role, { report: ["read"] })) topics.push("new_reports");
      if (hasStaffPermission(staff.role, { pet: ["moderate"] })) topics.push("pending_posts");
      await upsertSubscription(db, { endpoint, ...keys, topics, owner: { userId: staff.id } });
      return { ok: true };
    }
    const deviceHash = await ensureDeviceHash();
    const limit = await getRateLimiter().consume(`tecverde:push:${deviceHash}`, 10, 3600);
    if (!limit.allowed) return { ok: false };
    await upsertSubscription(db, {
      endpoint,
      ...keys,
      topics: ["report_updates"],
      owner: { deviceHash },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function removePushSubscription(input: {
  endpoint: string;
  audience: "device" | "staff";
}): Promise<{ ok: boolean }> {
  const endpoint = z.url().max(1024).safeParse(input.endpoint);
  if (!endpoint.success) return { ok: false };
  try {
    if (input.audience === "staff") {
      const staff = await requireStaff();
      await db
        .delete(pushSubscription)
        .where(
          and(eq(pushSubscription.endpoint, endpoint.data), eq(pushSubscription.userId, staff.id)),
        );
      return { ok: true };
    }
    const deviceHash = await getDeviceHash();
    if (!deviceHash) return { ok: false };
    await db
      .delete(pushSubscription)
      .where(
        and(
          eq(pushSubscription.endpoint, endpoint.data),
          eq(pushSubscription.deviceHash, deviceHash),
        ),
      );
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

import "server-only";

import { db } from "@/server/db";
import { sendPush } from "@/server/push/web-push";

import {
  deleteSubscriptions,
  listDeviceSubscriptions,
  listStaffSubscriptions,
} from "./push-repository";

import type { PushTopic } from "@/server/db/schema/push";
import type { PushPayload, PushTarget } from "@/server/push/web-push";

async function deliver(targets: PushTarget[], payload: PushPayload) {
  const results = await Promise.all(targets.map((target) => sendPush(target, payload)));
  const gone = targets
    .filter((_, index) => results[index] === "gone")
    .map((target) => target.endpoint);
  await deleteSubscriptions(db, gone);
}

/** Notifies every browser that opted in on the reporter's device. */
export async function pushToDevice(deviceHash: string, payload: PushPayload) {
  try {
    await deliver(await listDeviceSubscriptions(db, deviceHash), payload);
  } catch (error) {
    console.error("[push] device delivery failed", error instanceof Error ? error.message : error);
  }
}

const topicRoles: Record<Exclude<PushTopic, "report_updates">, string[]> = {
  new_reports: ["admin", "maintenance"],
  pending_posts: ["admin", "moderator"],
};

export async function pushToStaff(
  topic: Exclude<PushTopic, "report_updates">,
  payload: PushPayload,
) {
  try {
    await deliver(await listStaffSubscriptions(db, topic, topicRoles[topic]), payload);
  } catch (error) {
    console.error("[push] staff delivery failed", error instanceof Error ? error.message : error);
  }
}

import { and, eq, inArray, sql } from "drizzle-orm";

import { user } from "@/server/db/schema/auth";
import { pushSubscription } from "@/server/db/schema/push";

import type { connectDatabase } from "@/server/db/connection";
import type { PushTopic } from "@/server/db/schema/push";

type Database = ReturnType<typeof connectDatabase>;

export type SubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  topics: PushTopic[];
  owner: { userId: string } | { deviceHash: string };
};

export async function upsertSubscription(database: Database, input: SubscriptionInput) {
  const owner =
    "userId" in input.owner
      ? { userId: input.owner.userId, deviceHash: null }
      : { userId: null, deviceHash: input.owner.deviceHash };
  await database
    .insert(pushSubscription)
    .values({
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      topics: input.topics,
      ...owner,
    })
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: { p256dh: input.p256dh, auth: input.auth, topics: input.topics, ...owner },
    });
}

export async function deleteSubscriptions(database: Database, endpoints: string[]) {
  if (endpoints.length === 0) return;
  await database.delete(pushSubscription).where(inArray(pushSubscription.endpoint, endpoints));
}

function hasTopic(topic: PushTopic) {
  return sql`exists (select 1 from json_each(${pushSubscription.topics}) where value = ${topic})`;
}

const targetColumns = {
  endpoint: pushSubscription.endpoint,
  p256dh: pushSubscription.p256dh,
  auth: pushSubscription.auth,
};

export async function listDeviceSubscriptions(database: Database, deviceHash: string) {
  return database
    .select(targetColumns)
    .from(pushSubscription)
    .where(and(eq(pushSubscription.deviceHash, deviceHash), hasTopic("report_updates")));
}

export async function listStaffSubscriptions(
  database: Database,
  topic: PushTopic,
  roles: string[],
) {
  return database
    .select(targetColumns)
    .from(pushSubscription)
    .innerJoin(user, eq(user.id, pushSubscription.userId))
    .where(and(hasTopic(topic), inArray(user.role, roles), sql`coalesce(${user.banned}, 0) = 0`));
}

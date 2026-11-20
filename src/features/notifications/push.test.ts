import { expect, test } from "bun:test";
import { v7 } from "uuid";

import { connectDatabase } from "@/server/db/connection";
import { user } from "@/server/db/schema";

import { migrateDatabase } from "../../../scripts/db-migrate";
import {
  deleteSubscriptions,
  listDeviceSubscriptions,
  listStaffSubscriptions,
  upsertSubscription,
} from "./push-repository";

const keys = {
  p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
  auth: "tBHItJI5svbpez7KI4CCXg",
};

test("subscriptions target devices and staff roles by topic and can be removed", async () => {
  const database = connectDatabase({ url: "file::memory:" });
  try {
    await migrateDatabase(database);
    const maintenance = v7();
    const moderator = v7();
    await database.insert(user).values(
      [
        [maintenance, "maintenance"],
        [moderator, "moderator"],
      ].map(([id, role]) => ({
        id: String(id),
        name: String(role),
        email: `${role}@tecverde.test`,
        emailVerified: true,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );

    await upsertSubscription(database, {
      endpoint: "https://push.example/device",
      ...keys,
      topics: ["report_updates"],
      owner: { deviceHash: "device-a" },
    });
    await upsertSubscription(database, {
      endpoint: "https://push.example/maintenance",
      ...keys,
      topics: ["new_reports"],
      owner: { userId: maintenance },
    });
    await upsertSubscription(database, {
      endpoint: "https://push.example/moderator",
      ...keys,
      topics: ["pending_posts"],
      owner: { userId: moderator },
    });
    // Re-subscribing the same endpoint updates it instead of duplicating it.
    await upsertSubscription(database, {
      endpoint: "https://push.example/device",
      ...keys,
      topics: ["report_updates"],
      owner: { deviceHash: "device-a" },
    });

    expect(
      (await listDeviceSubscriptions(database, "device-a")).map((row) => row.endpoint),
    ).toEqual(["https://push.example/device"]);
    expect(await listDeviceSubscriptions(database, "device-b")).toHaveLength(0);
    expect(
      (await listStaffSubscriptions(database, "new_reports", ["admin", "maintenance"])).map(
        (row) => row.endpoint,
      ),
    ).toEqual(["https://push.example/maintenance"]);
    expect(
      (await listStaffSubscriptions(database, "pending_posts", ["admin", "maintenance"])).map(
        (row) => row.endpoint,
      ),
    ).toEqual([]);

    await deleteSubscriptions(database, ["https://push.example/device"]);
    expect(await listDeviceSubscriptions(database, "device-a")).toHaveLength(0);
  } finally {
    database.$client.close();
  }
});

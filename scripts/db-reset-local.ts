import { mkdir } from "node:fs/promises";
import { rm } from "node:fs/promises";

import { connectDatabase, databaseCredentials } from "@/server/db/connection";

import { migrateDatabase } from "./db-migrate";
import { seedCatalog } from "./seed";

const path = new URL("../.data/local.db", import.meta.url);
const configuredUrl = new URL(databaseCredentials().url);

if (
  process.env.VERCEL ||
  process.env.NODE_ENV === "production" ||
  configuredUrl.origin !== "http://127.0.0.1:3180" ||
  !process.argv.includes("--confirm")
) {
  throw new Error(
    "Stop Turso dev, then run bun run db:reset:local --confirm to replace .data/local.db.",
  );
}

await Promise.all(
  ["", "-wal", "-shm"].map((suffix) => rm(new URL(path.href + suffix), { force: true })),
);

await mkdir(new URL("../.data/", import.meta.url), { recursive: true });
const database = connectDatabase({ url: path.href });
try {
  await migrateDatabase(database);
  await seedCatalog(database);
  console.log("Recreated .data/local.db with the placeholder campus catalog.");
} finally {
  database.$client.close();
}

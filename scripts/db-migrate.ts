import { migrate } from "drizzle-orm/libsql/migrator";
import { fileURLToPath } from "node:url";

import { connectDatabase } from "@/server/db/connection";

export async function migrateDatabase(database: ReturnType<typeof connectDatabase>) {
  const result = await migrate(database, {
    migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
  });

  if (result) throw new Error(`Drizzle migrations failed: ${result.exitCode}`);
}

if (import.meta.main) {
  const database = connectDatabase();
  try {
    await migrateDatabase(database);
    console.log("Database migrations applied.");
  } finally {
    database.$client.close();
  }
}

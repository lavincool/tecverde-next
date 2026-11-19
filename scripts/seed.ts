import { sql } from "drizzle-orm";

import { initialBuildings, initialCategories } from "@/messages/es-MX/catalog";
import { connectDatabase } from "@/server/db/connection";
import { building, reportCategory } from "@/server/db/schema/catalog";

export async function seedCatalog(database: ReturnType<typeof connectDatabase>) {
  await database.batch([
    database
      .insert(building)
      .values(
        initialBuildings.map(({ slug, name, shortName }, sortOrder) => ({
          slug,
          name,
          shortName,
          sortOrder,
        })),
      )
      .onConflictDoUpdate({
        target: building.slug,
        set: {
          name: sql`excluded.name`,
          shortName: sql`excluded.short_name`,
          sortOrder: sql`excluded.sort_order`,
        },
      }),
    database
      .insert(reportCategory)
      .values(
        initialCategories.map(({ slug, name, iconKey, defaultPriority }, sortOrder) => ({
          slug,
          name,
          iconKey,
          defaultPriority,
          sortOrder,
        })),
      )
      .onConflictDoUpdate({
        target: reportCategory.slug,
        set: {
          name: sql`excluded.name`,
          iconKey: sql`excluded.icon_key`,
          defaultPriority: sql`excluded.default_priority`,
          sortOrder: sql`excluded.sort_order`,
        },
      }),
  ]);
}

if (import.meta.main) {
  const database = connectDatabase();
  try {
    await seedCatalog(database);
    console.log("Seeded the placeholder campus catalog.");
  } finally {
    database.$client.close();
  }
}

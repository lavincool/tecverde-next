import { sql } from "drizzle-orm";
import { integer, text } from "drizzle-orm/sqlite-core";
import { v7 } from "uuid";

import type { SQLWrapper } from "drizzle-orm";

export function id() {
  return text("id").primaryKey().$defaultFn(v7);
}

export function timestamp(name: string) {
  return integer(name, { mode: "timestamp_ms" });
}

export function createdAt() {
  return timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date());
}

export function updatedAt() {
  return timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());
}

export function oneOf(column: SQLWrapper, values: readonly string[]) {
  const literals = values.map((value) => sql.raw(`'${value.replaceAll("'", "''")}'`));
  return sql`${column} in (${sql.join(literals, sql`, `)})`;
}

import { drizzle } from "drizzle-orm/libsql";
import { z } from "zod";

const endpoint = z.url({ protocol: /^(https?|libsql|file)$/ });

export function databaseCredentials() {
  const url = endpoint.parse(process.env.TURSO_DATABASE_URL ?? "http://127.0.0.1:3180");
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const host = new URL(url).hostname;

  if (
    process.env.VERCEL &&
    (!authToken || host === "localhost" || host === "127.0.0.1" || host === "")
  ) {
    throw new Error("Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the Vercel environment.");
  }
  return authToken ? { url, authToken } : { url };
}

export function connectDatabase(connection = databaseCredentials()) {
  return drizzle({ connection });
}

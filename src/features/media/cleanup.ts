import "server-only";

import { db } from "@/server/db";
import { deleteObjects, isStorageConfigured } from "@/server/storage/r2";

import { deleteMediaRows, listMediaToPurge } from "./repository";

/** Deletes orphaned uploads and media of entities past their soft-delete window. */
export async function cleanupMedia(now = new Date()) {
  if (!isStorageConfigured()) return { deleted: 0, skipped: true };
  const rows = await listMediaToPurge(db, now);
  const byBucket = { public: [] as string[], private: [] as string[] };
  for (const row of rows) byBucket[row.bucket].push(row.key);
  await Promise.all([
    deleteObjects("public", byBucket.public),
    deleteObjects("private", byBucket.private),
  ]);
  await deleteMediaRows(
    db,
    rows.map((row) => row.id),
  );
  return { deleted: rows.length, skipped: false };
}

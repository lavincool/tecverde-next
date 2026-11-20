import { and, asc, count, eq, inArray, isNotNull, lt, ne, or } from "drizzle-orm";

import { pet } from "@/server/db/schema/adoption";
import { media } from "@/server/db/schema/media";
import { report } from "@/server/db/schema/reports";

import type { MediaBucket, MediaKind } from "./keys";
import type { connectDatabase } from "@/server/db/connection";

type Database = ReturnType<typeof connectDatabase>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type MediaDescriptor = {
  contentType: string;
  size: number;
  width: number;
  height: number;
  dominantColor: string;
};

export type StoredMedia = {
  id: string;
  bucket: MediaBucket;
  key: string;
  kind: MediaKind;
  width: number;
  height: number;
  dominantColor: string;
  sizeBytes: number;
};

const storedColumns = {
  id: media.id,
  bucket: media.bucket,
  key: media.key,
  kind: media.kind,
  width: media.width,
  height: media.height,
  dominantColor: media.dominantColor,
  sizeBytes: media.sizeBytes,
};

export async function countDraftMedia(database: Database, draftId: string, kind: MediaKind) {
  const [row] = await database
    .select({ total: count() })
    .from(media)
    .where(and(eq(media.draftId, draftId), eq(media.kind, kind), ne(media.status, "deleted")));
  return row?.total ?? 0;
}

export async function insertPendingMedia(
  database: Database,
  rows: (MediaDescriptor & {
    id: string;
    bucket: MediaBucket;
    key: string;
    kind: MediaKind;
    draftId: string;
    sortOrder: number;
    deviceHash: string | null;
    uploadedByUserId: string | null;
  })[],
) {
  if (rows.length === 0) return;
  await database.insert(media).values(
    rows.map((row) => ({
      id: row.id,
      bucket: row.bucket,
      key: row.key,
      kind: row.kind,
      draftId: row.draftId,
      status: "pending" as const,
      contentType: row.contentType,
      sizeBytes: row.size,
      width: row.width,
      height: row.height,
      dominantColor: row.dominantColor,
      sortOrder: row.sortOrder,
      deviceHash: row.deviceHash,
      uploadedByUserId: row.uploadedByUserId,
    })),
  );
}

export async function listPendingDraftMedia(
  database: Database,
  input: { draftId: string; kind: MediaKind; ids: string[] },
): Promise<StoredMedia[]> {
  if (input.ids.length === 0) return [];
  return database
    .select(storedColumns)
    .from(media)
    .where(
      and(
        eq(media.draftId, input.draftId),
        eq(media.kind, input.kind),
        eq(media.status, "pending"),
        inArray(media.id, input.ids),
      ),
    )
    .orderBy(asc(media.sortOrder), asc(media.id));
}

/** Links verified pending uploads to their owner inside the caller's transaction. */
export async function attachMedia(
  tx: Database | Transaction,
  input: {
    draftId: string;
    kind: MediaKind;
    ids: string[];
    owner: { reportId: string } | { petId: string };
    now?: Date;
  },
) {
  if (input.ids.length === 0) return [];
  const owner =
    "reportId" in input.owner ? { reportId: input.owner.reportId } : { petId: input.owner.petId };
  return tx
    .update(media)
    .set({ ...owner, status: "attached", attachedAt: input.now ?? new Date() })
    .where(
      and(
        eq(media.draftId, input.draftId),
        eq(media.kind, input.kind),
        eq(media.status, "pending"),
        inArray(media.id, input.ids),
      ),
    )
    .returning({ id: media.id });
}

export async function listAttachedMedia(
  database: Database,
  owner: { reportId: string } | { petId: string },
  kinds: MediaKind[],
): Promise<StoredMedia[]> {
  const ownerFilter =
    "reportId" in owner ? eq(media.reportId, owner.reportId) : eq(media.petId, owner.petId);
  return database
    .select(storedColumns)
    .from(media)
    .where(and(ownerFilter, eq(media.status, "attached"), inArray(media.kind, kinds)))
    .orderBy(asc(media.sortOrder), asc(media.id));
}

/** Pending uploads never attached, plus media of entities past their soft-delete window. */
export async function listMediaToPurge(database: Database, now: Date, limit = 500) {
  const pendingCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const deletedCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const stale = await database
    .select({ id: media.id, bucket: media.bucket, key: media.key })
    .from(media)
    .where(
      or(
        and(eq(media.status, "pending"), lt(media.createdAt, pendingCutoff)),
        eq(media.status, "deleted"),
      ),
    )
    .limit(limit);
  const ofDeletedReports = await database
    .select({ id: media.id, bucket: media.bucket, key: media.key })
    .from(media)
    .innerJoin(report, eq(report.id, media.reportId))
    .where(and(isNotNull(report.deletedAt), lt(report.deletedAt, deletedCutoff)))
    .limit(limit);
  const ofDeletedPets = await database
    .select({ id: media.id, bucket: media.bucket, key: media.key })
    .from(media)
    .innerJoin(pet, eq(pet.id, media.petId))
    .where(and(isNotNull(pet.deletedAt), lt(pet.deletedAt, deletedCutoff)))
    .limit(limit);
  return [...stale, ...ofDeletedReports, ...ofDeletedPets];
}

export async function deleteMediaRows(database: Database, ids: string[]) {
  if (ids.length === 0) return;
  await database.delete(media).where(inArray(media.id, ids));
}

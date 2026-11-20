import "server-only";

import { v7 } from "uuid";
import { z } from "zod";

import { db } from "@/server/db";
import { getRateLimiter } from "@/server/security/rate-limit";
import {
  headObject,
  isStorageConfigured,
  presignUpload,
  readObjectPrefix,
} from "@/server/storage/r2";

import {
  bucketForKind,
  buildMediaKey,
  isAcceptableUpload,
  isWebpSignature,
  MAX_MEDIA_BYTES,
  MAX_MEDIA_DIMENSION,
  MEDIA_CONTENT_TYPE,
  mediaLimits,
} from "./keys";
import { countDraftMedia, insertPendingMedia, listPendingDraftMedia } from "./repository";

import type { MediaKind } from "./keys";
import type { StoredMedia } from "./repository";

export class MediaError extends Error {
  constructor(
    readonly reason: "unavailable" | "too_many" | "invalid_file" | "rate_limited" | "forbidden",
  ) {
    super(reason);
  }
}

export const uploadFileSchema = z.object({
  contentType: z.literal(MEDIA_CONTENT_TYPE),
  size: z.number().int().positive().max(MAX_MEDIA_BYTES),
  width: z.number().int().positive().max(MAX_MEDIA_DIMENSION),
  height: z.number().int().positive().max(MAX_MEDIA_DIMENSION),
  dominantColor: z.string().regex(/^#[\da-f]{6}$/i),
});

export const uploadFilesSchema = z.array(uploadFileSchema).min(1).max(10);
export type UploadFile = z.output<typeof uploadFileSchema>;

export type UploadTicket = {
  mediaId: string;
  url: string;
  headers: Record<string, string>;
};

const PRESIGN_LIMIT = 20;
const PRESIGN_WINDOW_SECONDS = 600;

/** Reserves media rows for a draft (or staff-owned entity) and presigns one PUT per file. */
export async function issueUploadTickets(input: {
  kind: MediaKind;
  ownerId: string;
  files: UploadFile[];
  rateKey: string;
  deviceHash: string | null;
  uploadedByUserId: string | null;
}): Promise<UploadTicket[]> {
  if (!isStorageConfigured()) throw new MediaError("unavailable");
  if (!input.files.every((file) => isAcceptableUpload(file))) {
    throw new MediaError("invalid_file");
  }

  const limit = await getRateLimiter().consume(
    `tecverde:media:presign:${input.rateKey}`,
    PRESIGN_LIMIT,
    PRESIGN_WINDOW_SECONDS,
  );
  if (!limit.allowed) throw new MediaError("rate_limited");

  const existing = await countDraftMedia(db, input.ownerId, input.kind);
  if (existing + input.files.length > mediaLimits[input.kind]) throw new MediaError("too_many");

  const bucket = bucketForKind(input.kind);
  const rows = input.files.map((file, index) => {
    const id = v7();
    return {
      ...file,
      id,
      bucket,
      key: buildMediaKey(input.kind, input.ownerId, id),
      kind: input.kind,
      draftId: input.ownerId,
      sortOrder: existing + index,
      deviceHash: input.deviceHash,
      uploadedByUserId: input.uploadedByUserId,
    };
  });
  await insertPendingMedia(db, rows);

  return Promise.all(
    rows.map(async (row) => {
      const signed = await presignUpload({
        bucket,
        key: row.key,
        contentType: row.contentType,
        contentLength: row.size,
      });
      return { mediaId: row.id, url: signed.url, headers: signed.headers };
    }),
  );
}

/** Confirms each object exists with the declared size and type and really is a WebP image. */
export async function verifyUploadedMedia(rows: StoredMedia[]): Promise<string[]> {
  if (rows.length === 0 || !isStorageConfigured()) return [];
  const results = await Promise.all(
    rows.map(async (row) => {
      const head = await headObject(row.bucket, row.key);
      if (!head || head.size !== row.sizeBytes || head.contentType !== MEDIA_CONTENT_TYPE) {
        return undefined;
      }
      const prefix = await readObjectPrefix(row.bucket, row.key, 12).catch(() => undefined);
      return prefix && isWebpSignature(prefix) ? row.id : undefined;
    }),
  );
  return results.filter((id) => id !== undefined);
}

export async function verifiedDraftMedia(input: {
  draftId: string;
  kind: MediaKind;
  ids: string[];
}): Promise<string[]> {
  const ids = [...new Set(input.ids)].slice(0, mediaLimits[input.kind]);
  const rows = await listPendingDraftMedia(db, { ...input, ids });
  return verifyUploadedMedia(rows);
}

import { v7 } from "uuid";

import type { mediaKinds } from "@/server/db/schema/media";

export type MediaBucket = "public" | "private";
export type MediaKind = (typeof mediaKinds)[number];

export const MEDIA_CONTENT_TYPE = "image/webp";
export const MAX_MEDIA_BYTES = 2.5 * 1024 * 1024;
export const MIN_MEDIA_BYTES = 12;
export const MAX_MEDIA_DIMENSION = 4096;

export const mediaLimits = {
  report_before: 4,
  report_after: 4,
  pet_gallery: 10,
} as const satisfies Record<MediaKind, number>;

export function bucketForKind(kind: MediaKind): MediaBucket {
  return kind === "pet_gallery" ? "public" : "private";
}

/** Keys are immutable, unguessable and grouped by the entity (or reserved draft) id. */
export function buildMediaKey(kind: MediaKind, entityId: string, objectId: string = v7()) {
  const prefix = kind === "pet_gallery" ? "pets" : "reports";
  return `${prefix}/${entityId}/${objectId}.webp`;
}

const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

/** Checks the `RIFF....WEBP` container signature of the first 12 bytes. */
export function isWebpSignature(bytes: Uint8Array) {
  if (bytes.length < 12) return false;
  return (
    RIFF.every((value, index) => bytes[index] === value) &&
    WEBP.every((value, index) => bytes[index + 8] === value)
  );
}

export function isAcceptableUpload(file: { contentType: string; size: number }) {
  return (
    file.contentType === MEDIA_CONTENT_TYPE &&
    Number.isInteger(file.size) &&
    file.size >= MIN_MEDIA_BYTES &&
    file.size <= MAX_MEDIA_BYTES
  );
}

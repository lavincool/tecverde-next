import "server-only";

import { db } from "@/server/db";
import { isStorageConfigured, presignView } from "@/server/storage/r2";

import { listAttachedMedia } from "./repository";

import type { MediaKind } from "./keys";

export type ViewablePhoto = {
  id: string;
  url: string;
  width: number;
  height: number;
  dominantColor: string;
  kind: MediaKind;
};

export function publicMediaUrl(key: string) {
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  return base ? new URL(key, base.endsWith("/") ? base : `${base}/`).href : undefined;
}

/**
 * Returns short-lived signed URLs for private report photos. Callers must already have
 * authorized the viewer (staff permission, device ownership or a tracking token).
 */
export async function signedReportPhotos(
  reportId: string,
  kinds: MediaKind[],
): Promise<ViewablePhoto[]> {
  if (!isStorageConfigured()) return [];
  try {
    const rows = await listAttachedMedia(db, { reportId }, kinds);
    return await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        url: await presignView(row.bucket, row.key),
        width: row.width,
        height: row.height,
        dominantColor: row.dominantColor,
        kind: row.kind,
      })),
    );
  } catch {
    return [];
  }
}

import "server-only";

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { MediaBucket } from "@/features/media/keys";

export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const UPLOAD_URL_TTL_SECONDS = 300;
const VIEW_URL_TTL_SECONDS = 600;

type StorageConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  buckets: Record<MediaBucket, string>;
};

export function readStorageConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): StorageConfig | undefined {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_PUBLIC_BUCKET: publicBucket,
    R2_PRIVATE_BUCKET: privateBucket,
  } = environment;
  if (!accountId || !accessKeyId || !secretAccessKey || !publicBucket || !privateBucket) {
    return undefined;
  }
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    buckets: { public: publicBucket, private: privateBucket },
  };
}

export function isStorageConfigured() {
  return readStorageConfig() !== undefined;
}

let cached: { client: S3Client; config: StorageConfig } | undefined;

function storage() {
  if (cached) return cached;
  const config = readStorageConfig();
  if (!config) throw new Error("Configure the R2 account, credentials and bucket names.");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  cached = { client, config };
  return cached;
}

/** Presigns a PUT that only succeeds with the signed content type and cache headers. */
export async function presignUpload(input: {
  bucket: MediaBucket;
  key: string;
  contentType: string;
  contentLength: number;
}) {
  const { client, config } = storage();
  const command = new PutObjectCommand({
    Bucket: config.buckets[input.bucket],
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
    CacheControl: IMMUTABLE_CACHE_CONTROL,
  });
  const url = await getSignedUrl(client, command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
    signableHeaders: new Set(["content-type", "content-length", "cache-control"]),
  });
  return {
    url,
    headers: { "Content-Type": input.contentType, "Cache-Control": IMMUTABLE_CACHE_CONTROL },
  };
}

export async function presignView(bucket: MediaBucket, key: string) {
  const { client, config } = storage();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: config.buckets[bucket], Key: key }), {
    expiresIn: VIEW_URL_TTL_SECONDS,
  });
}

export async function headObject(bucket: MediaBucket, key: string) {
  const { client, config } = storage();
  try {
    const head = await client.send(
      new HeadObjectCommand({ Bucket: config.buckets[bucket], Key: key }),
    );
    return { size: head.ContentLength ?? 0, contentType: head.ContentType ?? "" };
  } catch {
    return undefined;
  }
}

export async function readObjectPrefix(bucket: MediaBucket, key: string, bytes: number) {
  const { client, config } = storage();
  const object = await client.send(
    new GetObjectCommand({
      Bucket: config.buckets[bucket],
      Key: key,
      Range: `bytes=0-${bytes - 1}`,
    }),
  );
  const body = await object.Body?.transformToByteArray();
  return body ?? new Uint8Array();
}

export async function deleteObjects(bucket: MediaBucket, keys: string[]) {
  if (keys.length === 0) return;
  const { client, config } = storage();
  for (let start = 0; start < keys.length; start += 1000) {
    const batch = keys.slice(start, start + 1000);
    // oxlint-disable-next-line no-await-in-loop -- R2 accepts at most 1000 keys per request.
    await client.send(
      new DeleteObjectsCommand({
        Bucket: config.buckets[bucket],
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }
}

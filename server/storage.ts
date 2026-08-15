import { GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { validStorageKey } from "./security";

const allowedContentTypes = new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"]);
const maxUploadBytes = 10 * 1024 * 1024;

let client: S3Client | null = null;

function storageConfig() {
  return {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "us-east-1",
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  };
}

export function storageConfigured() {
  const config = storageConfig();
  return Boolean(config.endpoint && config.bucket && config.accessKeyId && config.secretAccessKey);
}

export function storageSummary() {
  const config = storageConfig();
  return { configured: storageConfigured(), endpoint: config.endpoint ? new URL(config.endpoint).origin : null, bucket: config.bucket ?? null, region: config.region };
}

function getClient() {
  const config = storageConfig();
  if (!storageConfigured() || !config.endpoint || !config.bucket || !config.accessKeyId || !config.secretAccessKey) throw new Error("Object storage is not configured.");
  if (!client) client = new S3Client({ endpoint: config.endpoint, region: config.region, forcePathStyle: config.forcePathStyle, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  return { client, bucket: config.bucket };
}

export function validateMediaInput(key: string, contentType: string, size: number) {
  if (!validStorageKey(key) || !key.startsWith("merchant/")) throw Object.assign(new Error("Invalid storage key."), { status: 400 });
  if (!allowedContentTypes.has(contentType)) throw Object.assign(new Error("Only image uploads are allowed."), { status: 400 });
  if (!Number.isInteger(size) || size <= 0 || size > maxUploadBytes) throw Object.assign(new Error("Image size must be between 1 byte and 10 MB."), { status: 400 });
}

export async function createUploadUrl(input: { key: string; contentType: string; size: number }) {
  validateMediaInput(input.key, input.contentType, input.size);
  const { client: s3, bucket } = getClient();
  const command = new PutObjectCommand({ Bucket: bucket, Key: input.key, ContentType: input.contentType, ContentLength: input.size, CacheControl: "public, max-age=31536000, immutable" });
  return { key: input.key, uploadUrl: await getSignedUrl(s3, command, { expiresIn: 600 }), expiresIn: 600 };
}

export async function readObject(key: string) {
  if (!validStorageKey(key)) throw Object.assign(new Error("Invalid storage key."), { status: 400 });
  const { client: s3, bucket } = getClient();
  const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) return null;
  return { body: Buffer.from(await result.Body.transformToByteArray()), contentType: result.ContentType ?? "application/octet-stream", contentLength: result.ContentLength ?? undefined, cacheControl: result.CacheControl ?? "public, max-age=31536000, immutable" };
}

export async function pingStorage() {
  if (!storageConfigured()) return false;
  try { const { client: s3, bucket } = getClient(); await s3.send(new HeadBucketCommand({ Bucket: bucket })); return true; } catch { return false; }
}

export async function objectExists(key: string) {
  if (!validStorageKey(key)) throw Object.assign(new Error("Invalid storage key."), { status: 400 });
  const { client: s3, bucket } = getClient();
  try { await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); return true; } catch (error) { if ((error as { name?: string }).name === "NotFound") return false; throw error; }
}

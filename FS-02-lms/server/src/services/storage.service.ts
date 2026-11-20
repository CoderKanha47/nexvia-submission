import { mkdirSync, createWriteStream, createReadStream, existsSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { join, dirname } from 'node:path';
import { env } from '../config/env';

/**
 * Blob storage abstraction. If S3 buckets are configured we use S3 and return
 * signed URLs; otherwise we store to local disk and serve via Express.
 */

const hasS3 = !!env.S3_UPLOAD_BUCKET && !!env.AWS_REGION;
const s3Client = hasS3 ? new S3Client({ region: env.AWS_REGION }) : null;

/**
 * Local disk layout: `hls/` keys live under HLS_DIR (written by the transcode
 * worker), everything else under UPLOAD_DIR.
 */
export function resolveStorePath(relative: string): string {
  const rel = relative.replace(/^\/+/, '');
  return rel.startsWith('hls/')
    ? join(env.HLS_DIR, rel.slice(4))
    : join(env.UPLOAD_DIR, rel);
}

function localPath(prefix: string, ...parts: string[]): string {
  const p = resolveStorePath(join(prefix, ...parts));
  mkdirSync(dirname(p), { recursive: true });
  return p;
}

export function localExists(relative: string): boolean {
  return existsSync(resolveStorePath(relative));
}

export function localStat(relative: string): { size: number } | null {
  const p = resolveStorePath(relative);
  if (!existsSync(p)) return null;
  const s = statSync(p);
  return { size: s.size };
}

export function resolveLocal(relative: string): string {
  return resolveStorePath(relative);
}

export function readStream(relative: string): NodeJS.ReadableStream {
  return createReadStream(resolveStorePath(relative));
}

/** Upload a file from a local path (or buffer) into the abstract store. */
export async function putBlob(
  relative: string,
  source: NodeJS.ReadableStream | Buffer,
  opts: { contentType?: string } = {},
): Promise<{ url?: string }> {
  if (s3Client && env.S3_UPLOAD_BUCKET) {
    const body = Buffer.isBuffer(source) ? source : await bufferify(source);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.S3_UPLOAD_BUCKET,
        Key: relative,
        Body: body,
        ContentType: opts.contentType,
      }),
    );
    return {};
  }
  const target = localPath('', relative);
  mkdirSync(dirname(target), { recursive: true });
  if (Buffer.isBuffer(source)) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(target, source);
  } else {
    await pipeline(source, createWriteStream(target));
  }
  return {};
}

export async function putFile(
  relative: string,
  localSource: string,
  opts: { contentType?: string } = {},
): Promise<{ url?: string }> {
  if (s3Client && env.S3_UPLOAD_BUCKET) {
    const { readFileSync } = await import('node:fs');
    return putBlob(relative, readFileSync(localSource), opts);
  }
  const target = localPath('', relative);
  mkdirSync(dirname(target), { recursive: true });
  await pipeline(createReadStream(localSource), createWriteStream(target));
  return {};
}

async function bufferify(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Return a GET url (contains signed signature) for a stored blob. */
export async function getReadUrl(
  relative: string,
  bucketOverride?: string,
  opts: { expiresSec?: number } = {},
): Promise<string | null> {
  if (s3Client && (bucketOverride ?? env.S3_UPLOAD_BUCKET)) {
    const bucket = bucketOverride ?? env.S3_UPLOAD_BUCKET!;
    const command = new GetObjectCommand({ Bucket: bucket, Key: relative });
    return getSignedUrl(s3Client, command, { expiresIn: opts.expiresSec ?? 3600 });
  }
  if (!localExists(relative)) return null;
  return `${env.SERVER_URL}/api/v1/media/${relative}?expires=${Date.now() + (opts.expiresSec ?? 3600) * 1000}`;
}

/** Write a local file to S3 if configured; otherwise copy locally. */
export async function putLocalFileToStore(
  relative: string,
  localSource: string,
  opts: { contentType?: string } = {},
): Promise<{ url?: string }> {
  return putFile(relative, localSource, opts);
}

/**
 * Return a short-lived signed URL for a stored blob. Uses the HLS bucket for
 * `hls/` keys and the upload bucket otherwise. Falls back to a signed local
 * media path when S3 is not configured.
 */
export async function storageSignedUrl(
  relative: string,
  expiresMs = 2 * 60 * 60 * 1000,
): Promise<string | null> {
  const bucket = relative.startsWith('hls/')
    ? env.S3_HLS_BUCKET
    : relative.startsWith('certificates/')
      ? env.S3_CERT_BUCKET
      : env.S3_UPLOAD_BUCKET;
  if (s3Client && bucket) {
    const command = new GetObjectCommand({ Bucket: bucket, Key: relative });
    return getSignedUrl(s3Client, command, { expiresIn: Math.round(expiresMs / 1000) });
  }
  if (!localExists(relative)) return null;
  return `${env.SERVER_URL}/api/v1/media/${relative}?expires=${Date.now() + expiresMs}`;
}
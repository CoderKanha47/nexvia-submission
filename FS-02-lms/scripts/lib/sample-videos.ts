import 'dotenv/config';
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { QueueEvents, Worker } from 'bullmq';
import { env } from '../../server/src/config/env';
import { connectRedis, disconnectRedis } from '../../server/src/config/redis';
import { transcodeQueue } from '../../server/src/config/queue';
import { processTranscodeJob, type TranscodeJobResult } from '../../server/src/workers/transcode.processor';
import { VideoAssetModel, type VideoAssetDoc } from '../../server/src/models/video-asset.model';

const SAMPLE_VIDEOS_DIR = join(process.cwd(), 'sample videos');
export const SAMPLE_CLIPS = ['sample1.mp4', 'sample2.mp4', 'sample3.mp4'] as const;

export interface ProcessedClip {
  name: string;
  assetId: string;
  durationSec: number;
  renditions: string[];
  action: 'created' | 'reused';
  elapsedMs?: number;
}

interface EnsureOptions {
  ownerId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  /** Injected for tests; defaults to a real BullMQ worker in-process. */
  quiet?: boolean;
}

function marker(name: string): string {
  return `sample/${name}`;
}

function toResult(doc: VideoAssetDoc, name: string, action: ProcessedClip['action'], elapsedMs?: number): ProcessedClip {
  return {
    name,
    assetId: String(doc.id),
    durationSec: doc.durationSec ?? 0,
    renditions: (doc.renditions ?? []).map((r) => r.name),
    action,
    elapsedMs,
  };
}

function isReusable(doc: VideoAssetDoc | null): doc is VideoAssetDoc {
  if (!doc || doc.status !== 'ready') return false;
  const names = (doc.renditions ?? []).map((r) => r.name);
  if (!names.includes('360p') || !names.includes('720p')) return false;
  if (!doc.durationSec || doc.durationSec <= 0) return false;
  return existsSync(join(env.HLS_DIR, String(doc.id), 'master.m3u8'));
}

/**
 * Ensures every sample clip has exactly one VideoAsset that went through the
 * real pipeline: upload record -> BullMQ `transcode` job -> FFmpeg HLS worker.
 * Idempotent: already-ready assets (360p+720p ladder, real duration, master
 * playlist on disk) are reused, so a clip is transcoded only once.
 */
export async function ensureSampleVideosProcessed(opts: EnsureOptions): Promise<ProcessedClip[]> {
  if (mongoose.connection.readyState !== 1) throw new Error('MongoDB not connected');
  await connectRedis();

  const sourceFiles = SAMPLE_CLIPS.map((name) => ({ name, src: join(SAMPLE_VIDEOS_DIR, name) }));
  for (const f of sourceFiles) {
    if (!existsSync(f.src)) throw new Error(`Sample clip not found: ${f.src}`);
  }

  const results: ProcessedClip[] = [];
  const pending: Array<{ name: string; assetId: string }> = [];

  for (const { name, src } of sourceFiles) {
    const existing = await VideoAssetModel.findOne({ originalKey: marker(name) });
    if (isReusable(existing)) {
      if (!opts.quiet) console.log(`  = ${name} already processed (asset ${existing.id}, ${existing.durationSec}s)`);
      results.push(toResult(existing, name, 'reused'));
      continue;
    }
    if (existing) {
      await VideoAssetModel.deleteOne({ _id: existing._id });
      rmSync(join(env.HLS_DIR, String(existing.id)), { recursive: true, force: true });
    }

    const asset = await VideoAssetModel.create({
      ownerId: opts.ownerId,
      courseId: opts.courseId,
      originalKey: marker(name),
      status: 'uploaded',
    });

    const assetDir = join(env.UPLOAD_DIR, 'uploads', String(asset.id));
    mkdirSync(assetDir, { recursive: true });
    copyFileSync(src, join(assetDir, 'original.mp4'));

    asset.status = 'queued';
    await asset.save();
    pending.push({ name, assetId: String(asset.id) });
    if (!opts.quiet) console.log(`  > ${name} queued as asset ${asset.id}`);
  }

  if (pending.length > 0) {
    const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    const worker = new Worker('transcode', processTranscodeJob, { connection, concurrency: 1 });
    // waitUntilFinished needs a QueueEvents (BullMQ v5+), which requires its own connection.
    const queueEvents = new QueueEvents('transcode', {
      connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
    });
    try {
      for (const item of pending) {
        const job = await transcodeQueue.add('transcode', { assetId: item.assetId }, { attempts: 2 });
        const value = (await job.waitUntilFinished(queueEvents)) as TranscodeJobResult;
        const doc = await VideoAssetModel.findById(item.assetId);
        if (!doc) throw new Error(`Asset ${item.assetId} disappeared after transcode`);
        if (doc.status !== 'ready') throw new Error(`Asset ${item.assetId} ended as ${doc.status}: ${doc.error ?? 'unknown error'}`);
        if (!opts.quiet) {
          console.log(
            `  ✓ ${item.name} ready in ${value.elapsedMs}ms — ${value.durationSec}s, renditions: ${value.renditions.map((r) => r.name).join(', ')}`,
          );
        }
        results.push(toResult(doc, item.name, 'created', value.elapsedMs));
      }
    } finally {
      await queueEvents.close();
      await worker.close();
      await connection.quit();
    }
  }

  const byName = new Map(results.map((r) => [r.name, r]));
  return SAMPLE_CLIPS.map((name) => byName.get(name)!);
}

/** Convenience entry point for standalone use (connects/disconnects for you). */
export async function processSampleVideosCli(): Promise<ProcessedClip[]> {
  await mongoose.connect(env.MONGO_URI);
  try {
    const { Course } = await import('../../server/src/models/Course');
    const { UserModel } = await import('../../server/src/models/user.model');
    const course = await Course.findOne({ status: 'published' }).sort({ createdAt: 1 });
    const owner = await UserModel.findOne({ role: 'instructor' });
    if (!course || !owner) throw new Error('Seed users/courses missing — run `npm run seed` first');
    const results = await ensureSampleVideosProcessed({
      ownerId: owner._id as mongoose.Types.ObjectId,
      courseId: course._id as mongoose.Types.ObjectId,
    });
    printClipResults(results);
    return results;
  } finally {
    await mongoose.disconnect();
    await disconnectRedis();
  }
}

export function printClipResults(results: ProcessedClip[]): void {
  console.log('\nSample video pipeline results:');
  for (const r of results) {
    console.log(
      `  ${r.action === 'created' ? 'NEW ' : 'OK  '} ${r.name}  asset=${r.assetId}  duration=${r.durationSec}s  renditions=${r.renditions.join('+')}` +
        (r.elapsedMs !== undefined ? `  transcode=${r.elapsedMs}ms` : ''),
    );
  }
}

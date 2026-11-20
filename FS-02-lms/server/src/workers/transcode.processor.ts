import type { Job } from 'bullmq';
import { env } from '../config/env';
import { VideoAssetModel } from '../models/video-asset.model';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { transcodeToHls } from './ffmpeg';
import { putBlob } from '../services/storage.service';

export interface TranscodeJobResult {
  renditions: Array<{ name: string; width: number; height: number; bitrateKbps: number }>;
  durationSec: number;
  elapsedMs: number;
}

/** BullMQ processor for the `transcode` queue. Extracted so scripts can run it in-process. */
export async function processTranscodeJob(job: Job): Promise<TranscodeJobResult> {
  const { assetId } = job.data;
  const asset = await VideoAssetModel.findById(assetId);
  if (!asset) throw new Error(`Asset ${assetId} not found`);
  const id = String(asset.id);

  asset.status = 'processing';
  asset.progressPct = 1;
  await asset.save();

  const localOriginal = join(env.UPLOAD_DIR, 'uploads', `${asset.id}`, 'original.mp4');
  if (!existsSync(localOriginal)) {
    throw new Error(`Source file missing for asset ${assetId}`);
  }

  const outDir = join(env.HLS_DIR, asset.id);
  const start = Date.now();
  const { renditions, durationSec } = await transcodeToHls(localOriginal, outDir, async (pct) => {
    asset.progressPct = pct;
    await asset.save();
  });

  if (env.S3_HLS_BUCKET) {
    const { readdirSync, statSync, readFileSync } = await import('node:fs');
    async function walk(dir: string, rel: string): Promise<void> {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const childRel = `${rel}/${entry}`;
        if (statSync(full).isDirectory()) {
          await walk(full, childRel);
        } else {
          const mime = entry.endsWith('.m3u8')
            ? 'application/vnd.apple.mpegurl'
            : entry.endsWith('.ts')
              ? 'video/mp2t'
              : 'application/octet-stream';
          await putBlob(`hls/${id}/${childRel}`, readFileSync(full), { contentType: mime });
        }
      }
    }
    await walk(outDir, '');
  }

  asset.renditions = renditions as unknown as typeof asset.renditions;
  asset.durationSec = durationSec;
  asset.hlsPrefix = `hls/${asset.id}`;
  asset.status = 'ready';
  asset.progressPct = 100;
  await asset.save();

  const elapsedMs = Date.now() - start;
  await job.updateProgress({ pct: 100, elapsedMs });
  return { renditions, durationSec, elapsedMs };
}

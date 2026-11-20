import { Worker, WorkerOptions } from 'bullmq';
import { redis } from '../config/redis';
import { VideoAssetModel } from '../models/video-asset.model';
import { processTranscodeJob } from './transcode.processor';

const workerOpts: WorkerOptions = {
  connection: redis,
  concurrency: 1,
};

export const transcodeWorker = new Worker('transcode', processTranscodeJob, workerOpts);

transcodeWorker.on('failed', async (job, err) => {
  if (!job) return;
  const asset = await VideoAssetModel.findById(job.data.assetId);
  if (asset) {
    asset.status = 'failed';
    asset.error = err.message.slice(0, 500);
    await asset.save();
  }
});

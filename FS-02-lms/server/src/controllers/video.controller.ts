import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import multer from 'multer';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { VideoAssetModel } from '../models/video-asset.model';
import { Course } from '../models';
import { getPresignedUploadUrl } from '../services/s3.service';
import { transcodeQueue } from '../config/queue';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/errors';
import { env } from '../config/env';
import { paramStr } from '../utils/params';

function assertOwnsCourse(userId: string, courseId: string): Promise<void> {
  return Course.exists({ _id: courseId, instructorId: userId }).then((found) => {
    if (!found) throw new AppError(403, 'FORBIDDEN', 'You do not own this course');
  });
}

export const getUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, filename, contentType } = req.body;
  await assertOwnsCourse(req.user!.id, courseId);

  const asset = await VideoAssetModel.create({
    ownerId: req.user!.id,
    courseId,
    originalKey: `uploads/${new Types.ObjectId().toString()}/original-${sanitize(filename)}`,
    status: 'uploaded',
  });

  const uploadUrl = await getPresignedUploadUrl(asset.id, filename, contentType);
  res.json({ data: { assetId: asset.id, uploadUrl, filename, contentType } });
});

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export const completeUpload = asyncHandler(async (req: Request, res: Response) => {
  const asset = await VideoAssetModel.findById(paramStr(req, 'id'));
  if (!asset || asset.ownerId.toString() !== req.user!.id) {
    throw new AppError(404, 'NOT_FOUND', 'Asset not found');
  }
  asset.status = 'queued';
  await asset.save();
  const job = await transcodeQueue.add('transcode', { assetId: asset.id }, { attempts: 2 });
  asset.jobId = job.id;
  await asset.save();
  res.json({ data: asset.toJSON() });
});

export const getVideoAsset = asyncHandler(async (req: Request, res: Response) => {
  const asset = await VideoAssetModel.findById(paramStr(req, 'id'));
  if (!asset || asset.ownerId.toString() !== req.user!.id) {
    throw new AppError(404, 'NOT_FOUND', 'Asset not found');
  }
  res.json({ data: asset.toJSON() });
});

// ---- Local upload (fallback when S3 is unconfigured) ----

const uploadDir = join(env.UPLOAD_DIR, 'uploads');
mkdirSync(uploadDir, { recursive: true });
const localUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${sanitize(file.originalname)}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
});

export const localUploadMiddleware = localUpload.single('video');

export const localUploadHandler = asyncHandler(async (req: Request, res: Response) => {
  const assetId = paramStr(req, 'id');
  const file = req.file;
  if (!file) throw new AppError(400, 'VALIDATION_ERROR', 'No file uploaded ("video" field)');

  const asset = await VideoAssetModel.findById(assetId);
  if (!asset) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Asset not found' } });
    return;
  }

  const { rename } = await import('node:fs/promises');
  await rename(file.path, join(uploadDir, asset.id, 'original.mp4')).catch(async () => {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(join(uploadDir, asset.id), { recursive: true });
    await rename(file.path, join(uploadDir, asset.id, 'original.mp4'));
  });

  asset.originalKey = `uploads/${asset.id}/original.mp4`;
  asset.status = 'queued';
  await asset.save();

  const job = await transcodeQueue.add('transcode', { assetId: asset.id }, { attempts: 2 });
  asset.jobId = job.id;
  await asset.save();

  res.json({ data: asset.toJSON() });
});
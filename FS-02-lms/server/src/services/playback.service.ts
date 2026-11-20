import { Types } from 'mongoose';
import { env } from '../config/env';
import { Lesson } from '../models';
import { VideoAssetModel } from '../models/video-asset.model';
import { AppError } from '../utils/errors';
import { isCourseOwner, requireEnrollmentOrThrow } from './progress.service';
import { storageSignedUrl } from './storage.service';
import { getCloudFrontCookies } from './cloudfront.service';

export interface PlaybackInfo {
  manifestUrl: string;
  assetId: string;
  expiresAt: string;
  cookies?: Record<string, string>;
}

export async function getPlaybackInfo(
  lessonId: string,
  userId: Types.ObjectId,
  userRole: string,
): Promise<PlaybackInfo> {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson || !lesson.videoAssetId) {
    throw new AppError(404, 'NOT_FOUND', 'Lesson or video not found');
  }

  const courseId = lesson.courseId as Types.ObjectId;
  const isOwner = await isCourseOwner(userId, courseId);
  const isAdmin = userRole === 'admin';
  if (!isOwner && !isAdmin && !lesson.isFreePreview) {
    await requireEnrollmentOrThrow(userId, courseId);
  }

  const asset = await VideoAssetModel.findById(lesson.videoAssetId);
  if (!asset || asset.status !== 'ready') {
    throw new AppError(404, 'NOT_FOUND', 'Video not ready yet');
  }

  const expiresMs = 2 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + expiresMs).toISOString();

  const cookies = getCloudFrontCookies(`hls/${asset.id}/*`, 2 * 60 * 60);
  const manifestUrl =
    env.CLOUDFRONT_DOMAIN && Object.keys(cookies).length > 0
      ? `https://${env.CLOUDFRONT_DOMAIN}/hls/${asset.id}/master.m3u8`
      : await storageSignedUrl(`hls/${asset.id}/master.m3u8`, expiresMs);

  if (!manifestUrl) throw new AppError(404, 'NOT_FOUND', 'Manifest not available');

  return { manifestUrl, assetId: asset.id, expiresAt, cookies };
}
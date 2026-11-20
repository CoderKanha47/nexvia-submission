import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { getPlaybackInfo } from '../services/playback.service';
import { asyncHandler } from '../utils/async-handler';

export const playback = asyncHandler(async (req: Request, res: Response) => {
  const lessonId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const info = await getPlaybackInfo(lessonId, new Types.ObjectId(req.user!.id), req.user!.role);
  res.json({ data: info });
});
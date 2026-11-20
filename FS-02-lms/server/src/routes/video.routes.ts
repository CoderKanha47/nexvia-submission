import { Router } from 'express';
import { z } from 'zod';
import { completeUpload, getUploadUrl } from '../controllers/video.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';

const uploadUrlSchema = z.object({
  courseId: z.string(),
  filename: z.string(),
  contentType: z.string(),
});

export const videoRouter = Router();

videoRouter.post(
  '/upload-url',
  requireAuth,
  requireRole('instructor'),
  validateBody(uploadUrlSchema),
  getUploadUrl,
);

videoRouter.post(
  '/:id/complete',
  requireAuth,
  requireRole('instructor'),
  completeUpload,
);

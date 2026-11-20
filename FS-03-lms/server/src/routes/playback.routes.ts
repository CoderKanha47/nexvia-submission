import { Router } from 'express';
import { playback } from '../controllers/playback.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const playbackRouter = Router();

playbackRouter.get('/:id/playback', requireAuth, playback);
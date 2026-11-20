import { Router } from 'express';
import {
  createLiveClass,
  getLiveClass,
  listMyLiveClasses,
  listUpcomingForCourse,
  addChatMessage,
  getChatHistory,
  getLiveKitTokenHandler,
  startLiveClassHandler,
  endLiveClassHandler,
  updateLiveClassHandler,
  listUpcomingLiveClasses,
} from '../controllers/live-class.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const liveClassRouter = Router();

liveClassRouter.use(requireAuth);

liveClassRouter.post('/', requireRole('instructor', 'admin'), createLiveClass);
liveClassRouter.get('/mine', listMyLiveClasses);
liveClassRouter.get('/upcoming', listUpcomingLiveClasses);
liveClassRouter.get('/courses/:courseId/upcoming', listUpcomingForCourse);
liveClassRouter.get('/:id', getLiveClass);
liveClassRouter.patch('/:id', requireRole('instructor', 'admin'), updateLiveClassHandler);
liveClassRouter.post('/:id/start', requireRole('instructor', 'admin'), startLiveClassHandler);
liveClassRouter.post('/:id/end', requireRole('instructor', 'admin'), endLiveClassHandler);
liveClassRouter.post('/:id/token', getLiveKitTokenHandler);
liveClassRouter.post('/:id/chat', addChatMessage);
liveClassRouter.get('/:id/chat/history', getChatHistory);
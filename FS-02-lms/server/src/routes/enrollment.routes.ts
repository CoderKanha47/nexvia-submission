import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.middleware';
import {
  freeEnroll,
  getCourseProgressHandler,
  getCourseStudents,
  listMyEnrollments,
  updateLessonProgress,
} from '../controllers/enrollment.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const progressBodySchema = z.object({
  positionSec: z.number().min(0).optional(),
  completed: z.boolean().optional(),
});

export const enrollmentRouter = Router();

enrollmentRouter.use(requireAuth);

// Student-only endpoints
enrollmentRouter.get('/mine', requireRole('student'), listMyEnrollments);
enrollmentRouter.get('/courses/:id/progress', requireRole('student'), getCourseProgressHandler);
enrollmentRouter.post('/courses/:id/enroll-free', requireRole('student'), freeEnroll);
enrollmentRouter.put('/lessons/:id/progress', requireRole('student'), validateBody(progressBodySchema), updateLessonProgress);

// Instructor/Admin endpoints
enrollmentRouter.get('/courses/:id/students', requireRole('instructor', 'admin'), getCourseStudents);
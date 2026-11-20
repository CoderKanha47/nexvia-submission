import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.middleware';
import {
  payForCourse,
  getMyPayments,
  getAdminPayments,
  getInstructorPayments,
} from '../controllers/paynext.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const paySchema = z.object({
  courseId: z.string().min(1, 'courseId is required'),
});

export const paynextRouter = Router();

paynextRouter.use(requireAuth);

paynextRouter.post('/pay', requireRole('student'), validateBody(paySchema), payForCourse);
paynextRouter.get('/me', requireRole('student'), getMyPayments);
paynextRouter.get('/admin', requireRole('admin'), getAdminPayments);
paynextRouter.get('/instructor', requireRole('instructor'), getInstructorPayments);
import { Router } from 'express';
import {
  getAdminPayments,
  getAdminActivity,
  adminStatsStream,
} from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireRole('admin'));

adminRouter.get('/payments', getAdminPayments);
adminRouter.get('/activity', getAdminActivity);
adminRouter.get('/stream', adminStatsStream);
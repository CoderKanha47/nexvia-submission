import { Router } from 'express';
import {
  adminStats,
  checkout,
  earningsByCourse,
  earningsMonthly,
  earningsSummary,
  getInstructorPayments,
  myOrders,
  requestPayoutHandler,
  transactions,
} from '../controllers/payment.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const paymentRouter = Router();

paymentRouter.use(requireAuth);

// Student-only endpoints
paymentRouter.get('/courses/:courseId/checkout', requireRole('student'), checkout);
paymentRouter.get('/orders', requireRole('student'), myOrders);

// Instructor/Admin endpoints
paymentRouter.get('/earnings/summary', requireRole('instructor', 'admin'), earningsSummary);
paymentRouter.get('/earnings/by-course', requireRole('instructor', 'admin'), earningsByCourse);
paymentRouter.get('/earnings/monthly', requireRole('instructor', 'admin'), earningsMonthly);
paymentRouter.get('/earnings/transactions', requireRole('instructor', 'admin'), transactions);
paymentRouter.get('/earnings/payments', requireRole('instructor', 'admin'), getInstructorPayments);
paymentRouter.post('/earnings/request-payout', requireRole('instructor', 'admin'), requestPayoutHandler);

// Admin-only endpoints
paymentRouter.get('/admin/stats', requireRole('admin'), adminStats);
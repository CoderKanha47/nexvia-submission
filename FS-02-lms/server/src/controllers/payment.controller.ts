import type { Request, Response } from 'express';
import {
  createCheckoutSession,
  getAdminStats,
  getEarningsByCourse,
  getEarningsMonthly,
  getEarningsSummary,
  getInstructorPayments as getInstructorPaymentsService,
  getMyOrders,
  getTransactions,
  requestPayout,
} from '../services/payment.service';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/errors';
import { paramStr } from '../utils/params';

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const result = await createCheckoutSession(req.user!.id, paramStr(req, 'courseId'));
  res.json({ data: result });
});

export const myOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await getMyOrders(req.user!.id);
  res.json({ data: orders });
});

export const earningsSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await getEarningsSummary(req.user!.id);
  res.json({ data: summary });
});

export const earningsByCourse = asyncHandler(async (req: Request, res: Response) => {
  const data = await getEarningsByCourse(req.user!.id);
  res.json({ data });
});

export const earningsMonthly = asyncHandler(async (req: Request, res: Response) => {
  const months = Math.max(1, Math.min(24, Number(req.query.months ?? 12)));
  const data = await getEarningsMonthly(req.user!.id, months);
  res.json({ data });
});

export const transactions = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const data = await getTransactions(req.user!.id, page, limit);
  res.json({ data });
});

export const requestPayoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const amountCents = Number(req.body.amountCents);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'amountCents must be a positive number');
  }
  await requestPayout(req.user!.id, amountCents);
  res.json({ data: { ok: true } });
});

export const adminStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getAdminStats();
  res.json({ data: stats });
});

export const getInstructorPayments = asyncHandler(async (req: Request, res: Response) => {
  const payments = await getInstructorPaymentsService(req.user!.id);
  res.json({ data: payments });
});
import type { Request, Response } from 'express';
import {
  payForCourse as payForCourseService,
  getPaymentsByUser,
  getAllPayments,
  getPaymentsByInstructor,
} from '../services/paynext.service';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/errors';

export const payForCourse = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.body;
  if (!courseId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'courseId is required');
  }
  const result = await payForCourseService(req.user!.id, courseId);
  res.json({ data: result });
});

export const getMyPayments = asyncHandler(async (req: Request, res: Response) => {
  const payments = await getPaymentsByUser(req.user!.id);
  res.json({ data: payments });
});

export const getAdminPayments = asyncHandler(async (req: Request, res: Response) => {
  const payments = await getAllPayments();
  res.json({ data: payments });
});

export const getInstructorPayments = asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role !== 'instructor' && req.user!.role !== 'admin') {
    throw new AppError(403, 'FORBIDDEN', 'Instructor access required');
  }
  const payments = await getPaymentsByInstructor(req.user!.id);
  res.json({ data: payments });
});
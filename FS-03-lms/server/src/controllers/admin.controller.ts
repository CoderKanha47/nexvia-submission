import type { Request, Response } from 'express';
import { PaymentModel, PaymentStatus } from '../models/payment.model';
import { asyncHandler } from '../utils/async-handler';
import { paynextEvents } from '../services/paynext.service';

export const getAdminPayments = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    PaymentModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'course',
        },
      },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'course.instructorId',
          foreignField: '_id',
          as: 'instructor',
        },
      },
      { $unwind: { path: '$instructor', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          userId: 1,
          courseId: 1,
          amountCents: 1,
          currency: 1,
          status: 1,
          gateway: 1,
          transactionId: 1,
          createdAt: 1,
          'user.name': 1,
          'user.email': 1,
          'course.title': 1,
          'instructor.name': 1,
        },
      },
    ]),
    PaymentModel.countDocuments(),
  ]);

  const formatted = payments.map(p => ({
    id: p._id.toString(),
    userId: p.userId?.toString() ?? '',
    userName: p.user?.name ?? 'Deleted user',
    userEmail: p.user?.email ?? '',
    courseId: p.courseId?.toString() ?? '',
    courseTitle: p.course?.title ?? 'Deleted course',
    instructorName: p.instructor?.name ?? 'Unknown instructor',
    amountCents: p.amountCents,
    currency: p.currency,
    status: p.status as PaymentStatus,
    gateway: p.gateway,
    transactionId: p.transactionId,
    createdAt: p.createdAt.toISOString(),
  }));

  res.json({ data: { payments: formatted, meta: { page, limit, total } } });
});

export const getAdminActivity = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
  
  const recentPayments = await PaymentModel.aggregate([
    { $match: { status: 'SUCCEEDED' } },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $lookup: {
        from: 'courses',
        localField: 'courseId',
        foreignField: '_id',
        as: 'course',
      },
    },
    { $unwind: '$course' },
    {
      $project: {
        _id: 1,
        type: { $literal: 'payment.succeeded' },
        message: {
          $concat: ['New enrollment: ', '$user.name', ' bought ', '$course.title'],
        },
        createdAt: 1,
      },
    },
  ]);

  const activities = recentPayments.map(p => ({
    id: p._id.toString(),
    type: 'payment.succeeded' as const,
    message: p.message,
    createdAt: p.createdAt.toISOString(),
  }));

  res.json({ data: activities });
});

export const adminStatsStream = asyncHandler(async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const handlePaymentSucceeded = (data: Record<string, unknown>) => {
    sendEvent(data);
  };

  paynextEvents.on('payment.succeeded', handlePaymentSucceeded);

  const interval = setInterval(() => {
    sendEvent({ type: 'ping', timestamp: Date.now() });
  }, 30000);

  req.on('close', () => {
    clearInterval(interval);
    paynextEvents.off('payment.succeeded', handlePaymentSucceeded);
    res.end();
  });

  sendEvent({ type: 'connected', timestamp: Date.now() });
});
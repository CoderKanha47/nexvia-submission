import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { UserModel } from '../models/user.model';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/errors';
import { paramStr } from '../utils/params';

export const currentUser = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: req.user! });
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Admin only');
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    UserModel.find({}, { passwordHash: 0 }).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
    UserModel.countDocuments(),
  ]);
  res.json({ data: { users, total, page, limit } });
});

export const suspendUser = asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Admin only');
  const userId = new Types.ObjectId(paramStr(req, 'userId'));
  const user = await UserModel.findByIdAndUpdate(userId, { isActive: false }, { new: true }).select(
    '-passwordHash',
  ).lean();
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  res.json({ data: user });
});
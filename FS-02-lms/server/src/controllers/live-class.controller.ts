import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { LiveClassModel, ChatMessageModel } from '../models/live-class.model';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/errors';
import { paramStr } from '../utils/params';
import {
  getLiveKitToken as getLiveKitTokenService,
  startLiveClass,
  endLiveClass,
  updateLiveClass,
  getUpcomingLiveClasses,
} from '../services/live-class.service';

export const createLiveClass = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, scheduledAt, roomName, durationMin } = req.body;
  const liveClass = await LiveClassModel.create({
    title,
    description,
    instructorId: req.user!.id,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    durationMin: durationMin ?? 60,
    roomName: roomName || `room-${Date.now()}`,
    createdAt: new Date(),
  });
  res.status(201).json({ data: liveClass.toJSON() });
});

export const listMyLiveClasses = asyncHandler(async (req: Request, res: Response) => {
  const classes = await LiveClassModel.find({ instructorId: req.user!.id })
    .sort({ scheduledAt: -1 })
    .lean();
  res.json({ data: classes });
});

export const getLiveClass = asyncHandler(async (req: Request, res: Response) => {
  const liveClass = await LiveClassModel.findById(paramStr(req, 'id')).lean();
  if (!liveClass) throw new AppError(404, 'NOT_FOUND', 'Live class not found');
  res.json({ data: liveClass });
});

export const listUpcomingForCourse = asyncHandler(async (req: Request, res: Response) => {
  const courseId = new Types.ObjectId(paramStr(req, 'courseId'));
  const classes = await LiveClassModel.find({
    courseId,
    scheduledAt: { $gt: new Date() },
  })
    .sort({ scheduledAt: 1 })
    .lean();
  res.json({ data: classes });
});

export const addChatMessage = asyncHandler(async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) throw new AppError(400, 'VALIDATION_ERROR', 'message is required');
  const liveClass = await LiveClassModel.findById(paramStr(req, 'id'));
  if (!liveClass) throw new AppError(404, 'NOT_FOUND', 'Live class not found');
  const msg = await ChatMessageModel.create({
    liveClassId: liveClass._id,
    userId: req.user!.id,
    role: req.user!.role,
    message,
    createdAt: new Date(),
  });
  res.status(201).json({ data: msg.toJSON() });
});

export const getChatHistory = asyncHandler(async (req: Request, res: Response) => {
  const liveClass = await LiveClassModel.findById(paramStr(req, 'id'));
  if (!liveClass) throw new AppError(404, 'NOT_FOUND', 'Live class not found');
  const messages = await ChatMessageModel.find({ liveClassId: liveClass._id })
    .sort({ createdAt: 1 })
    .lean();
  res.json({ data: messages });
});

export const getLiveKitTokenHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = new Types.ObjectId(req.user!.id);
  const result = await getLiveKitTokenService(paramStr(req, 'id'), userId, req.user!.role);
  res.json({ data: result });
});

export const startLiveClassHandler = asyncHandler(async (req: Request, res: Response) => {
  const instructorId = new Types.ObjectId(req.user!.id);
  const liveClass = await startLiveClass(paramStr(req, 'id'), instructorId);
  res.json({ data: liveClass.toJSON() });
});

export const endLiveClassHandler = asyncHandler(async (req: Request, res: Response) => {
  const instructorId = new Types.ObjectId(req.user!.id);
  const liveClass = await endLiveClass(paramStr(req, 'id'), instructorId);
  res.json({ data: liveClass.toJSON() });
});

export const updateLiveClassHandler = asyncHandler(async (req: Request, res: Response) => {
  const instructorId = new Types.ObjectId(req.user!.id);
  const { title, description, scheduledAt, durationMin, status } = req.body;
  const liveClass = await updateLiveClass(paramStr(req, 'id'), instructorId, {
    title,
    description,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    durationMin,
    status,
  });
  res.json({ data: liveClass.toJSON() });
});

export const listUpcomingLiveClasses = asyncHandler(async (req: Request, res: Response) => {
  const userId = new Types.ObjectId(req.user!.id);
  const classes = await getUpcomingLiveClasses(userId);
  res.json({ data: classes });
});
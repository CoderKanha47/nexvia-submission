import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { QuizModel } from '../models/quiz.model';
import { Course } from '../models';
import { Enrollment } from '../models';
import { getSanitizedQuiz, getQuizAttempts, submitAttempt } from '../services/quiz.service';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/errors';
import { paramStr } from '../utils/params';

export const createQuiz = asyncHandler(async (req: Request, res: Response) => {
  const { title, passMarkPct, maxAttempts, timeLimitSec, questions } = req.body;
  const created = await QuizModel.create({
    courseId: paramStr(req, 'courseId'),
    title,
    passMarkPct: passMarkPct ?? 70,
    maxAttempts,
    timeLimitSec,
    questions,
  });
  res.status(201).json({ data: created.toJSON() });
});

export const getQuiz = asyncHandler(async (req: Request, res: Response) => {
  const quizId = new Types.ObjectId(paramStr(req, 'id'));
  const quiz = await QuizModel.findById(quizId).lean();
  if (!quiz) throw new AppError(404, 'NOT_FOUND', 'Quiz not found');
  const course = await Course.findById(quiz.courseId).select('instructorId').lean();
  const instructorId = course?.instructorId?.toString();
  if (req.user!.role === 'admin' || instructorId === req.user!.id) {
    res.json({ data: quiz });
    return;
  }
  const enrolled = await Enrollment.exists({ userId: req.user!.id, courseId: quiz.courseId });
  if (!enrolled) throw new AppError(403, 'FORBIDDEN', 'You are not enrolled in this course');
  const sanitized = await getSanitizedQuiz(quizId);
  res.json({ data: sanitized });
});

export const updateQuiz = asyncHandler(async (req: Request, res: Response) => {
  const quizId = new Types.ObjectId(paramStr(req, 'id'));
  const quiz = await QuizModel.findByIdAndUpdate(quizId, req.body, { new: true });
  if (!quiz) throw new AppError(404, 'NOT_FOUND', 'Quiz not found');
  res.json({ data: quiz.toJSON() });
});

export const deleteQuiz = asyncHandler(async (req: Request, res: Response) => {
  const quizId = new Types.ObjectId(paramStr(req, 'id'));
  await QuizModel.deleteOne({ _id: quizId });
  res.status(204).send();
});

export const submitQuizAttempt = asyncHandler(async (req: Request, res: Response) => {
  const userId = new Types.ObjectId(req.user!.id);
  const quizId = new Types.ObjectId(paramStr(req, 'id'));
  const { answers } = req.body as { answers: Array<{ questionId: string; selectedOptionIds: string[] }> };
  const { attempt, graded } = await submitAttempt({ userId, quizId, answers });
  res.json({ data: { attempt, graded } });
});

export const listMyAttempts = asyncHandler(async (req: Request, res: Response) => {
  const userId = new Types.ObjectId(req.user!.id);
  const quizId = new Types.ObjectId(paramStr(req, 'id'));
  const attempts = await getQuizAttempts(quizId, userId);
  res.json({ data: attempts });
});
import { Types } from 'mongoose';
import { Enrollment, ILessonProgress } from '../models';
import { LessonProgress } from '../models';
import { Lesson } from '../models';
import { Course } from '../models';
import { QuizAttemptModel } from '../models/quiz-attempt.model';
import { AppError } from '../utils/errors';

export interface LessonProgressInput {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  lessonId: Types.ObjectId;
  positionSec?: number;
  completed?: boolean;
}

export async function ensureEnrollment(userId: Types.ObjectId, courseId: Types.ObjectId): Promise<boolean> {
  const found = await Enrollment.exists({ userId, courseId });
  return !!found;
}

export async function requireEnrollmentOrThrow(
  userId: Types.ObjectId,
  courseId: Types.ObjectId,
): Promise<void> {
  const ok = await ensureEnrollment(userId, courseId);
  if (!ok) throw new AppError(403, 'FORBIDDEN', 'You are not enrolled in this course');
}

export async function isCourseOwner(
  userId: Types.ObjectId,
  courseId: Types.ObjectId,
): Promise<boolean> {
  const course = await Course.findOne({ _id: courseId, instructorId: userId }).select('_id').lean();
  return !!course;
}

export async function saveLessonProgress(input: LessonProgressInput): Promise<ILessonProgress> {
  const lesson = await Lesson.findById(input.lessonId);
  if (!lesson || lesson.courseId.toString() !== input.courseId.toString()) {
    throw new AppError(404, 'NOT_FOUND', 'Lesson not found');
  }
  await requireEnrollmentOrThrow(input.userId, input.courseId);

  const update: Partial<ILessonProgress> = { lastPositionSec: input.positionSec ?? 0 };
  if (input.completed) {
    update.completed = true;
    update.completedAt = new Date();
  }

  const progress = await LessonProgress.findOneAndUpdate(
    { userId: input.userId, lessonId: input.lessonId },
    { $set: update, $setOnInsert: { courseId: input.courseId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await recomputeCourseProgress(input.userId, input.courseId);
  return progress;
}

export async function getCourseProgress(
  userId: Types.ObjectId,
  courseId: Types.ObjectId,
): Promise<{
  progressPct: number;
  completedLessons: number;
  totalLessons: number;
  lessons: Array<{ lessonId: string; completed: boolean; lastPositionSec: number }>;
  completedAt: Date | null;
}> {
  const [lessons, progresses, enrollment] = await Promise.all([
    Lesson.find({ courseId }).select('_id').lean(),
    LessonProgress.find({ userId, courseId }).lean(),
    Enrollment.findOne({ userId, courseId }).lean(),
  ]);
  const totalLessons = lessons.length;
  const completedLessons = progresses.filter((p) => p.completed).length;
  const progressPct = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  const map = new Map(progresses.map((p) => [p.lessonId.toString(), p]));
  const lessonRows = lessons.map((l) => {
    const p = map.get(l._id.toString());
    return {
      lessonId: l._id.toString(),
      completed: p?.completed ?? false,
      lastPositionSec: p?.lastPositionSec ?? 0,
    };
  });

  return {
    progressPct,
    completedLessons,
    totalLessons,
    lessons: lessonRows,
    completedAt: enrollment?.completedAt ?? null,
  };
}

/**
 * Recomputed course completion: all lessons completed, all quizzes passed.
 * Marks enrollment complete once and triggers certificate issuance (idempotent).
 */
export async function recomputeCourseProgress(
  userId: Types.ObjectId,
  courseId: Types.ObjectId,
): Promise<number> {
  const [lessons, progresses] = await Promise.all([
    Lesson.find({ courseId }).select('_id type quizId').lean(),
    LessonProgress.find({ userId, courseId }).select('lessonId completed').lean(),
  ]);
  const totalLessons = lessons.length;
  const doneMap = new Map(progresses.filter((p) => p.completed).map((p) => [p.lessonId.toString(), true]));
  const completedLessons = lessons.filter((l) => doneMap.has(l._id.toString())).length;
  const progressPct = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  await Enrollment.updateOne(
    { userId, courseId },
    { $set: { progressPct } },
  );

  const quizLessons = lessons.filter((l) => l.type === 'quiz' && l.quizId);
  let allQuizzesPassed = true;
  for (const l of quizLessons) {
    const passed = await QuizAttemptModel.exists({ userId, quizId: l.quizId, passed: true });
    if (!passed) {
      allQuizzesPassed = false;
      break;
    }
  }

  if (progressPct === 100 && allQuizzesPassed) {
    await markCourseComplete(userId, courseId);
  }

  return progressPct;
}

async function markCourseComplete(userId: Types.ObjectId, courseId: Types.ObjectId): Promise<void> {
  const enrollment = await Enrollment.findOneAndUpdate(
    { userId, courseId, completedAt: null },
    { $set: { completedAt: new Date(), progressPct: 100 } },
    { new: true },
  );
  if (!enrollment) return;
  // Fire-and-forget certificate issuance; idempotent inside the service.
  void import('../services/certificate.service').then(async (m) => {
    try {
      await m.issueCertificateForEnrollment(userId, courseId);
    } catch (err) {
      console.error('Certificate issuance failed:', err);
    }
  });
}
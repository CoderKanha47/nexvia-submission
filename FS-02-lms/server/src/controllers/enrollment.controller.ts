import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Enrollment, Course, Lesson } from '../models';
import { getCourseProgress, saveLessonProgress } from '../services/progress.service';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/errors';
import { assertCourseIsLive } from '../services/course.service';

function oid(req: Request, key: string): Types.ObjectId {
  const value = req.params[key];
  const id = Array.isArray(value) ? value[0] : value;
  if (!id || !Types.ObjectId.isValid(id)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid id');
  return new Types.ObjectId(id);
}

export const listMyEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const userId = new Types.ObjectId(req.user!.id);
  const enrollments = await Enrollment.find({ userId }).sort({ enrolledAt: -1 }).lean();
  const courses = await Course.find({ _id: { $in: enrollments.map((e) => e.courseId) } }).lean();
  const map = new Map(courses.map((c) => [c._id.toString(), c]));
  const data = enrollments.map((e) => {
    const c = map.get(e.courseId.toString());
    return {
      id: e._id.toString(),
      courseId: e.courseId.toString(),
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt ?? null,
      progressPct: e.progressPct,
      course: c
        ? {
            id: c._id.toString(),
            title: c.title,
            slug: c.slug,
            thumbnailUrl: c.thumbnailUrl ?? null,
            category: c.category,
            level: c.level,
            totalLessons: c.totalLessons,
          }
        : null,
    };
  });
  res.json({ data });
});

export const getCourseProgressHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = new Types.ObjectId(req.user!.id);
  const courseId = oid(req, 'id');
  const progress = await getCourseProgress(userId, courseId);
  res.json({ data: progress });
});

export const updateLessonProgress = asyncHandler(async (req: Request, res: Response) => {
  const userId = new Types.ObjectId(req.user!.id);
  const lessonId = oid(req, 'id');
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new AppError(404, 'NOT_FOUND', 'Lesson not found');

  const progress = await saveLessonProgress({
    userId,
    courseId: lesson.courseId as Types.ObjectId,
    lessonId,
    positionSec: req.body.positionSec,
    completed: req.body.completed,
  });
  res.json({ data: progress.toJSON() });
});

export const getCourseStudents = asyncHandler(async (req: Request, res: Response) => {
  const courseId = oid(req, 'id');
  const userId = new Types.ObjectId(req.user!.id);
  if (req.user!.role !== 'admin') {
    const owns = await Course.exists({ _id: courseId, instructorId: userId });
    if (!owns) throw new AppError(403, 'FORBIDDEN', 'You do not own this course');
  }
  const enrollments = await Enrollment.find({ courseId }).populate('userId', 'name email').lean();
  const data = enrollments.map((e) => {
    const u = e.userId as unknown as { _id: Types.ObjectId; name: string; email: string };
    return {
      userId: u._id.toString(),
      name: u.name,
      email: u.email,
      progressPct: e.progressPct,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt ?? null,
    };
  });
  res.json({ data });
});

export const freeEnroll = asyncHandler(async (req: Request, res: Response) => {
  const courseId = oid(req, 'id');
  const userId = new Types.ObjectId(req.user!.id);
  const course = await Course.findById(courseId);
  if (!course) throw new AppError(404, 'NOT_FOUND', 'Course not found');
  await assertCourseIsLive(courseId);
  if (course.priceCents !== 0) throw new AppError(400, 'VALIDATION_ERROR', 'Course is not free');
  const { enrollUser } = await import('../services/payment.service');
  await enrollUser(userId.toString(), courseId.toString());
  const enrollment = await Enrollment.findOne({ userId, courseId }).lean();
  res.status(201).json({ data: { enrolled: true, progressPct: enrollment?.progressPct ?? 0 } });
});
import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import {
  createCourse,
  getCourseByIdOrSlug,
  getCourses,
  getInstructorCourses,
  updateCourse,
  deleteCourse,
  submitForReview,
  publishCourse,
  unpublishCourse,
  createSection,
  updateSection,
  deleteSection,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderCourseContent,
  getCourseCurriculum,
} from '../services/course.service';
import { AppError } from '../utils/errors';
import { Section } from '../models/Section';

const createCourseBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  category: z.string().min(1).max(100),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  priceCents: z.number().int().min(0),
  currency: z.string().length(3).default('INR'),
  tags: z.array(z.string().max(50)).optional(),
});

const updateCourseBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).max(100).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  priceCents: z.number().int().min(0).optional(),
  currency: z.string().length(3).optional(),
  tags: z.array(z.string().max(50)).optional(),
  thumbnailUrl: z.string().url().optional(),
});

const updateCourseParamsSchema = z.object({
  id: z.string(),
});

const createSectionBodySchema = z.object({
  title: z.string().min(1).max(200),
  order: z.number().int().min(0).optional(),
});

const createSectionParamsSchema = z.object({
  id: z.string(),
});

const updateSectionBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  order: z.number().int().min(0).optional(),
});

const updateSectionParamsSchema = z.object({
  id: z.string(),
});

const createLessonBodySchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['video', 'quiz', 'text']),
  isFreePreview: z.boolean().optional(),
  videoAssetId: z.string().optional(),
  quizId: z.string().optional(),
  textContent: z.string().optional(),
});

const createLessonParamsSchema = z.object({
  id: z.string(),
});

const updateLessonBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z.enum(['video', 'quiz', 'text']).optional(),
  isFreePreview: z.boolean().optional(),
  videoAssetId: z.string().optional(),
  quizId: z.string().optional(),
  textContent: z.string().optional(),
  durationSec: z.number().int().min(0).optional(),
});

const updateLessonParamsSchema = z.object({
  id: z.string(),
});

const reorderBodySchema = z.object({
  sections: z.array(
    z.object({
      id: z.string(),
      order: z.number().int().min(0),
      lessons: z.array(z.object({ id: z.string(), order: z.number().int().min(0) })),
    })
  ),
});

const reorderParamsSchema = z.object({
  id: z.string(),
});

const listCoursesQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  level: z.string().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['newest', 'popular', 'price']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeComingSoon: z.enum(['true', 'false']).optional(),
});

function getParam(req: Request, key: string): string {
  const value = req.params[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

function getUserId(req: Request): Types.ObjectId {
  if (!req.user?.id) throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
  return new Types.ObjectId(req.user.id);
}

function isAdmin(req: Request): boolean {
  return req.user?.role === 'admin';
}

export async function listCourses(req: Request, res: Response) {
  const query = req.validatedQuery as z.infer<typeof listCoursesQuerySchema>;

  const result = await getCourses({
    q: query.q,
    category: query.category,
    level: query.level,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    sort: query.sort,
    page: query.page,
    limit: query.limit,
    includeComingSoon: query.includeComingSoon === 'true',
  });
  res.json({ data: result.courses, meta: result.meta });
}

export async function getCourse(req: Request, res: Response) {
  const idOrSlug = getParam(req, 'idOrSlug');
  const course = await getCourseByIdOrSlug(idOrSlug);
  if (!course) throw new AppError(404, 'NOT_FOUND', 'Course not found');
  res.json({ data: course });
}

export async function listMyCourses(req: Request, res: Response) {
  const instructorId = getUserId(req);
  const courses = await getInstructorCourses(instructorId);
  res.json({ data: courses });
}

export async function createCourseHandler(req: Request, res: Response) {
  const instructorId = getUserId(req);
  const course = await createCourse({ instructorId, ...req.body });
  res.status(201).json({ data: course });
}

export async function updateCourseHandler(req: Request, res: Response) {
  const instructorId = getUserId(req);
  const id = getParam(req, 'id');
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid course ID');
  const course = await updateCourse(new Types.ObjectId(id), instructorId, req.body, isAdmin(req));
  if (!course) throw new AppError(404, 'NOT_FOUND', 'Course not found');
  res.json({ data: course });
}

export async function deleteCourseHandler(req: Request, res: Response) {
  const instructorId = getUserId(req);
  const id = getParam(req, 'id');
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid course ID');
  const deleted = await deleteCourse(new Types.ObjectId(id), instructorId, isAdmin(req));
  if (!deleted) throw new AppError(404, 'NOT_FOUND', 'Course not found');
  res.status(204).send();
}

export async function submitCourseHandler(req: Request, res: Response) {
  const instructorId = getUserId(req);
  const id = getParam(req, 'id');
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid course ID');
  const course = await submitForReview(new Types.ObjectId(id), instructorId);
  if (!course) throw new AppError(404, 'NOT_FOUND', 'Course not found or not in draft status');
  res.json({ data: course });
}

export async function publishCourseHandler(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid course ID');
  const course = await publishCourse(new Types.ObjectId(id));
  if (!course) throw new AppError(404, 'NOT_FOUND', 'Course not found or not in pending_review status');
  res.json({ data: course });
}

export async function unpublishCourseHandler(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid course ID');
  const course = await unpublishCourse(new Types.ObjectId(id));
  if (!course) throw new AppError(404, 'NOT_FOUND', 'Course not found or not published');
  res.json({ data: course });
}

export async function createSectionHandler(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid course ID');
  const section = await createSection(new Types.ObjectId(id), req.body.title, req.body.order);
  res.status(201).json({ data: section });
}

export async function updateSectionHandler(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid section ID');
  const section = await updateSection(new Types.ObjectId(id), req.body);
  if (!section) throw new AppError(404, 'NOT_FOUND', 'Section not found');
  res.json({ data: section });
}

export async function deleteSectionHandler(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid section ID');
  await deleteSection(new Types.ObjectId(id));
  res.status(204).send();
}

export async function createLessonHandler(req: Request, res: Response) {
  const sectionId = getParam(req, 'id');
  if (!Types.ObjectId.isValid(sectionId)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid section ID');
  
  const section = await Section.findById(sectionId);
  if (!section) throw new AppError(404, 'NOT_FOUND', 'Section not found');
  
  const lesson = await createLesson(
    section.courseId,
    new Types.ObjectId(sectionId),
    {
      ...req.body,
      videoAssetId: req.body.videoAssetId ? new Types.ObjectId(req.body.videoAssetId) : undefined,
      quizId: req.body.quizId ? new Types.ObjectId(req.body.quizId) : undefined,
    }
  );
  res.status(201).json({ data: lesson });
}

export async function updateLessonHandler(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid lesson ID');
  const lesson = await updateLesson(new Types.ObjectId(id), {
    ...req.body,
    videoAssetId: req.body.videoAssetId ? new Types.ObjectId(req.body.videoAssetId) : undefined,
    quizId: req.body.quizId ? new Types.ObjectId(req.body.quizId) : undefined,
  });
  if (!lesson) throw new AppError(404, 'NOT_FOUND', 'Lesson not found');
  res.json({ data: lesson });
}

export async function deleteLessonHandler(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid lesson ID');
  await deleteLesson(new Types.ObjectId(id));
  res.status(204).send();
}

export async function reorderCourseHandler(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid course ID');
  await reorderCourseContent(new Types.ObjectId(id), req.body);
  res.status(204).send();
}

export async function getCourseCurriculumHandler(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid course ID');
  const curriculum = await getCourseCurriculum(new Types.ObjectId(id));
  res.json({ data: curriculum });
}

export const courseSchemas = {
  createCourseBody: createCourseBodySchema,
  updateCourseBody: updateCourseBodySchema,
  updateCourseParams: updateCourseParamsSchema,
  createSectionBody: createSectionBodySchema,
  createSectionParams: createSectionParamsSchema,
  updateSectionBody: updateSectionBodySchema,
  updateSectionParams: updateSectionParamsSchema,
  createLessonBody: createLessonBodySchema,
  createLessonParams: createLessonParamsSchema,
  updateLessonBody: updateLessonBodySchema,
  updateLessonParams: updateLessonParamsSchema,
  reorderBody: reorderBodySchema,
  reorderParams: reorderParamsSchema,
  listCoursesQuery: listCoursesQuerySchema,
};
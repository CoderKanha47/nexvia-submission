import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { validateBody, validateQuery } from '../middleware/validate.middleware';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  listCourses,
  getCourse,
  listMyCourses,
  createCourseHandler,
  updateCourseHandler,
  deleteCourseHandler,
  submitCourseHandler,
  publishCourseHandler,
  unpublishCourseHandler,
  createSectionHandler,
  updateSectionHandler,
  deleteSectionHandler,
  createLessonHandler,
  updateLessonHandler,
  deleteLessonHandler,
  reorderCourseHandler,
  getCourseCurriculumHandler,
  courseSchemas,
} from '../controllers/course.controller';

export const courseRouter = Router();

// Public routes - specific routes FIRST, then parameterized routes
courseRouter.get('/', validateQuery(courseSchemas.listCoursesQuery), asyncHandler(listCourses));
courseRouter.get('/mine', requireAuth, requireRole('instructor', 'admin'), asyncHandler(listMyCourses));
courseRouter.get('/:idOrSlug', asyncHandler(getCourse));
courseRouter.get('/:id/curriculum', asyncHandler(getCourseCurriculumHandler));

// Protected instructor routes
courseRouter.use(requireAuth, requireRole('instructor', 'admin'));

courseRouter.post('/', validateBody(courseSchemas.createCourseBody), asyncHandler(createCourseHandler));
courseRouter.patch('/:id', validateBody(courseSchemas.updateCourseBody), asyncHandler(updateCourseHandler));
courseRouter.delete('/:id', asyncHandler(deleteCourseHandler));
courseRouter.post('/:id/submit', asyncHandler(submitCourseHandler));

// Admin only routes
courseRouter.post('/:id/publish', requireRole('admin'), asyncHandler(publishCourseHandler));
courseRouter.post('/:id/unpublish', requireRole('admin'), asyncHandler(unpublishCourseHandler));

// Sections
courseRouter.post('/:id/sections', validateBody(courseSchemas.createSectionBody), asyncHandler(createSectionHandler));
courseRouter.patch('/sections/:id', validateBody(courseSchemas.updateSectionBody), asyncHandler(updateSectionHandler));
courseRouter.delete('/sections/:id', asyncHandler(deleteSectionHandler));

// Lessons
courseRouter.post('/sections/:id/lessons', validateBody(courseSchemas.createLessonBody), asyncHandler(createLessonHandler));
courseRouter.patch('/lessons/:id', validateBody(courseSchemas.updateLessonBody), asyncHandler(updateLessonHandler));
courseRouter.delete('/lessons/:id', asyncHandler(deleteLessonHandler));

// Reorder
courseRouter.put('/:id/reorder', validateBody(courseSchemas.reorderBody), asyncHandler(reorderCourseHandler));
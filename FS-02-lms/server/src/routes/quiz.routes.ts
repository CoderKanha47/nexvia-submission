import { Router } from 'express';
import {
  createQuiz,
  deleteQuiz,
  getQuiz,
  listMyAttempts,
  submitQuizAttempt,
  updateQuiz,
} from '../controllers/quiz.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const quizRouter = Router();

// Student endpoints (enrolled students)
quizRouter.get('/:id', requireAuth, requireRole('student', 'instructor', 'admin'), getQuiz);
quizRouter.post('/:id/submit', requireAuth, requireRole('student'), submitQuizAttempt);
quizRouter.get('/:id/attempts', requireAuth, requireRole('student'), listMyAttempts);

// Instructor/Admin endpoints
quizRouter.put('/:id', requireAuth, requireRole('instructor', 'admin'), updateQuiz);
quizRouter.delete('/:id', requireAuth, requireRole('instructor', 'admin'), deleteQuiz);

export const courseQuizRouter = Router();
courseQuizRouter.post('/', requireAuth, requireRole('instructor', 'admin'), createQuiz);
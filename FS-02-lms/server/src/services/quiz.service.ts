import { Types } from 'mongoose';
import { QuizModel } from '../models/quiz.model';
import { QuizAttemptModel } from '../models/quiz-attempt.model';
import { Lesson } from '../models';
import { Enrollment } from '../models';
import { AppError } from '../utils/errors';
import { recomputeCourseProgress } from './progress.service';

interface SubmittedAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

export interface GradedResult {
  scorePct: number;
  pointsEarned: number;
  pointsTotal: number;
  passed: boolean;
  results: Array<{
    questionId: string;
    correct: boolean;
    correctOptionIds: string[];
    explanation?: string;
  }>;
}

export function gradeQuiz(rawQuestions: QuizRawQuestion[], answers: SubmittedAnswer[]): GradedResult {
  const allowed = new Set(answers.map((a) => a.questionId));
  if (rawQuestions.some((q) => !allowed.has(q.id))) {
    return {
      scorePct: 0,
      pointsEarned: 0,
      pointsTotal: rawQuestions.reduce((s, q) => s + q.points, 0),
      passed: false,
      results: rawQuestions.map((q) => ({
        questionId: q.id,
        correct: false,
        correctOptionIds: q.correctOptionIds,
        explanation: q.explanation,
      })),
    };
  }

  const answerMap = new Map(answers.map((a) => [a.questionId, a.selectedOptionIds]));
  let pointsEarned = 0;
  const pointsTotal = rawQuestions.reduce((s, q) => s + q.points, 0);
  const results: GradedResult['results'] = [];

  for (const q of rawQuestions) {
    const selected = answerMap.get(q.id) ?? [];
    const correct = setsEqual(selected, q.correctOptionIds);
    if (correct) pointsEarned += q.points;
    results.push({
      questionId: q.id,
      correct,
      correctOptionIds: q.correctOptionIds,
      explanation: q.explanation,
    });
  }

  const scorePct = pointsTotal === 0 ? 0 : Math.round((pointsEarned / pointsTotal) * 100);
  return { scorePct, pointsEarned, pointsTotal, passed: scorePct >= 70, results };
}

export interface QuizRawQuestion {
  id: string;
  points: number;
  correctOptionIds: string[];
  explanation?: string;
}

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  return b.every((x) => sa.has(x));
}

export async function getSanitizedQuiz(quizId: Types.ObjectId) {
  const quiz = await QuizModel.findById(quizId).lean();
  if (!quiz) throw new AppError(404, 'NOT_FOUND', 'Quiz not found');
  return {
    ...quiz,
    questions: quiz.questions.map((q) => {
      const { correctOptionIds: _ignored, explanation: _e, ...rest } = q;
      void _ignored;
      void _e;
      return rest;
    }),
  };
}

/** Student submissions require enrollment; owner may view full. */
export async function submitAttempt(input: {
  userId: Types.ObjectId;
  quizId: Types.ObjectId;
  answers: SubmittedAnswer[];
}): Promise<{ attempt: unknown; graded: GradedResult }> {
  const quiz = await QuizModel.findById(input.quizId);
  if (!quiz) throw new AppError(404, 'NOT_FOUND', 'Quiz not found');

  const courseId = quiz.courseId;
  const enrolled = await Enrollment.exists({ userId: input.userId, courseId });
  if (!enrolled) throw new AppError(403, 'FORBIDDEN', 'You are not enrolled in this course');

  if (quiz.maxAttempts) {
    const count = await QuizAttemptModel.countDocuments({
      userId: input.userId,
      quizId: input.quizId,
    });
    if (count >= quiz.maxAttempts) {
      throw new AppError(409, 'CONFLICT', `Maximum ${quiz.maxAttempts} attempts reached`);
    }
  }

  const pointsTotal = quiz.questions.reduce((s, q) => s + q.points, 0);
  if (pointsTotal === 0) throw new AppError(400, 'VALIDATION_ERROR', 'Quiz has no points');

    const graded = gradeQuiz(
      (quiz.questions as QuizRawQuestion[]).map((q) => ({
        id: q.id,
        points: q.points,
        correctOptionIds: q.correctOptionIds,
        explanation: q.explanation ?? undefined,
      })),
      input.answers,
    );

  const attempt = await QuizAttemptModel.create({
    userId: input.userId,
    quizId: input.quizId,
    answers: input.answers,
    scorePct: graded.scorePct,
    pointsEarned: graded.pointsEarned,
    pointsTotal: graded.pointsTotal,
    passed: graded.passed,
    startedAt: new Date(),
    submittedAt: new Date(),
  });

  if (graded.passed) {
    // Mark the linked lesson (if any) as complete, then recompute course progress.
    const lesson = await Lesson.findOne({ quizId: input.quizId, type: 'quiz' });
    if (lesson) {
      const { LessonProgress } = await import('../models');
      await LessonProgress.updateOne(
        { userId: input.userId, lessonId: lesson._id },
        { $set: { completed: true, completedAt: new Date() }, $setOnInsert: { courseId } },
        { upsert: true },
      );
    }
    await recomputeCourseProgress(input.userId, courseId);
  }

  return { attempt, graded };
}

export async function getQuizAttempts(
  quizId: Types.ObjectId,
  userId: Types.ObjectId,
): Promise<unknown[]> {
  return QuizAttemptModel.find({ quizId, userId }).sort({ submittedAt: -1 }).lean();
}
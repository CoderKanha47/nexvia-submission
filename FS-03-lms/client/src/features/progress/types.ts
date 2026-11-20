export interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  courseId: string;
  completed: boolean;
  completedAt?: string;
  lastPositionSec: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseProgress {
  progressPct: number;
  completedLessons: number;
  totalLessons: number;
  lessons: Array<{
    lessonId: string;
    completed: boolean;
    lastPositionSec: number;
  }>;
  completedAt: string | null;
}

export interface LessonProgressInput {
  positionSec?: number;
  completed?: boolean;
}
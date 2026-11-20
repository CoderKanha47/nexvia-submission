export type QuizType = 'single' | 'multi' | 'truefalse';

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  type: QuizType;
  text: string;
  options: QuizOption[];
  correctOptionIds?: string[]; // Only for instructors
  points: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  passMarkPct: number;
  maxAttempts?: number;
  timeLimitSec?: number;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  answers: Array<{ questionId: string; selectedOptionIds: string[] }>;
  scorePct: number;
  pointsEarned: number;
  pointsTotal: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitQuizInput {
  answers: Array<{ questionId: string; selectedOptionIds: string[] }>;
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
export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  orderId?: string;
  enrolledAt: string;
  completedAt?: string;
  progressPct: number;
  completedLessons?: number;
  totalLessons?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseSummary {
  id: string;
  _id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  category: string;
  level: string;
  totalLessons: number;
}

export interface EnrollmentWithCourse extends Enrollment {
  course: CourseSummary | null;
}
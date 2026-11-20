export interface Course {
  id: string;
  _id: string;
  instructorId: string;
  instructorName?: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  priceCents: number;
  currency: string;
  thumbnailUrl?: string;
  status: 'draft' | 'pending_review' | 'published' | 'unpublished';
  tags: string[];
  totalLessons: number;
  totalDurationSec: number;
  ratingAvg?: number;
  comingSoon?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseWithSections extends Course {
  sections: SectionWithLessons[];
}

export interface Section {
  id: string;
  courseId: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SectionWithLessons extends Section {
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  courseId: string;
  sectionId: string;
  title: string;
  order: number;
  type: 'video' | 'quiz' | 'text';
  videoAssetId?: string;
  quizId?: string;
  textContent?: string;
  isFreePreview: boolean;
  durationSec: number;
  createdAt: string;
  updatedAt: string;
}
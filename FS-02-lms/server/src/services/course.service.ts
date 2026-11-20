import { Types, HydratedDocument } from 'mongoose';
import { Course, ICourse } from '../models/Course';
import { Section, ISection } from '../models/Section';
import { Lesson, ILesson } from '../models/Lesson';
import { Enrollment } from '../models/Enrollment';
import { AppError } from '../utils/errors';

export interface CreateCourseInput {
  instructorId: Types.ObjectId;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  priceCents: number;
  currency?: string;
  tags?: string[];
}

export interface UpdateCourseInput {
  title?: string;
  description?: string;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  priceCents?: number;
  currency?: string;
  tags?: string[];
  thumbnailUrl?: string;
}

export interface ReorderInput {
  sections: Array<{
    id: string;
    order: number;
    lessons: Array<{ id: string; order: number }>;
  }>;
}

type CourseDoc = HydratedDocument<ICourse>;
type SectionDoc = HydratedDocument<ISection>;
type LessonDoc = HydratedDocument<ILesson>;

/**
 * The ONE definition of "coming soon": a course is coming soon exactly when
 * it has no lessons yet. Everything (API payloads, enroll/payment guards)
 * must go through this helper — never read a stored flag.
 */
export function isComingSoon(lessonCount: number): boolean {
  return lessonCount === 0;
}

export async function getLessonCount(courseId: Types.ObjectId): Promise<number> {
  return Lesson.countDocuments({ courseId });
}

/** Bulk lesson counts for a list of courses -> Map<courseId, count>. */
export async function getLessonCountsByCourse(
  courseIds: Types.ObjectId[]
): Promise<Map<string, number>> {
  if (courseIds.length === 0) return new Map();
  const rows = await Lesson.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { courseId: { $in: courseIds } } },
    { $group: { _id: '$courseId', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.count]));
}

/** Throws 403 when the course is coming soon (lessonCount === 0). */
export async function assertCourseIsLive(courseId: Types.ObjectId): Promise<void> {
  const count = await getLessonCount(courseId);
  if (isComingSoon(count)) {
    throw new AppError(403, 'FORBIDDEN', 'This course is coming soon and cannot be enrolled in yet');
  }
}

async function generateUniqueSlug(title: string): Promise<string> {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80);

  let slug = baseSlug;
  let counter = 1;
  while (await Course.exists({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

function toCourse(doc: CourseDoc | null): ICourse | null {
  if (!doc) return null;
  return doc.toObject({ versionKey: false }) as ICourse;
}

function toSection(doc: SectionDoc | null): ISection | null {
  if (!doc) return null;
  return doc.toObject({ versionKey: false }) as ISection;
}

function toLesson(doc: LessonDoc | null): ILesson | null {
  if (!doc) return null;
  return doc.toObject({ versionKey: false }) as ILesson;
}

export async function createCourse(input: CreateCourseInput): Promise<ICourse> {
  const slug = await generateUniqueSlug(input.title);
  const course = await Course.create({
    ...input,
    slug,
    status: 'draft',
    totalLessons: 0,
    totalDurationSec: 0,
    comingSoon: isComingSoon(0),
  });
  return toCourse(course) as ICourse;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type CourseSections = Awaited<ReturnType<typeof getCourseCurriculum>>;
export type CourseDetail = ICourse & { comingSoon: boolean; sections: CourseSections };

export async function getCourseByIdOrSlug(idOrSlug: string): Promise<CourseDetail | null> {
  const doc = Types.ObjectId.isValid(idOrSlug)
    ? await Course.findById(idOrSlug)
    : await Course.findOne({ slug: idOrSlug });
  const course = toCourse(doc);
  if (!doc || !course) return null;

  const courseId = doc._id as Types.ObjectId;
  const [lessonCount, sections] = await Promise.all([
    getLessonCount(courseId),
    getCourseCurriculum(courseId),
  ]);
  return { ...course, comingSoon: isComingSoon(lessonCount), sections } as CourseDetail;
}

export async function getCourses(filters: {
  q?: string;
  category?: string;
  level?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'popular' | 'price';
  page?: number;
  limit?: number;
  includeComingSoon?: boolean;
}): Promise<{ courses: ICourse[]; meta: { page: number; limit: number; total: number } }> {
  const query: Record<string, unknown> = { status: 'published' };

  if (filters.q) {
    const rx = new RegExp(escapeRegExp(filters.q), 'i');
    query.$or = [{ title: rx }, { description: rx }, { category: rx }, { tags: rx }];
  }
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.level) {
    query.level = filters.level;
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    query.priceCents = {};
    if (filters.minPrice !== undefined) (query.priceCents as Record<string, number>).$gte = filters.minPrice;
    if (filters.maxPrice !== undefined) (query.priceCents as Record<string, number>).$lte = filters.maxPrice;
  }

  let sort: Record<string, 1 | -1> = { createdAt: -1 };
  if (filters.sort === 'popular') sort = { ratingAvg: -1, createdAt: -1 };
  if (filters.sort === 'price') sort = { priceCents: 1 };

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const docs = await Course.find(query).sort(sort).lean();
  const counts = await getLessonCountsByCourse(docs.map((d) => d._id as Types.ObjectId));

  const rows = docs.map((d) => ({
    ...(d as unknown as ICourse),
    comingSoon: isComingSoon(counts.get(String(d._id)) ?? 0),
  }));

  // Default: live courses only. ?includeComingSoon=true -> full catalog.
  const visible = filters.includeComingSoon ? rows : rows.filter((c) => c.comingSoon === false);

  return {
    courses: visible.slice(skip, skip + limit) as unknown as ICourse[],
    meta: { page, limit, total: visible.length },
  };
}

export async function getInstructorCourses(instructorId: Types.ObjectId): Promise<ICourse[]> {
  const docs = await Course.find({ instructorId }).sort({ createdAt: -1 }).lean();
  const counts = await getLessonCountsByCourse(docs.map((d) => d._id as Types.ObjectId));
  return docs.map((d) => ({
    ...(d as unknown as ICourse),
    comingSoon: isComingSoon(counts.get(String(d._id)) ?? 0),
  })) as unknown as ICourse[];
}

export async function updateCourse(
  courseId: Types.ObjectId,
  instructorId: Types.ObjectId,
  input: UpdateCourseInput,
  isAdmin = false
): Promise<ICourse | null> {
  const query: Record<string, unknown> = { _id: courseId };
  if (!isAdmin) query.instructorId = instructorId;

  const course = await Course.findOneAndUpdate(query, input, { new: true, runValidators: true });
  return toCourse(course);
}

export async function deleteCourse(
  courseId: Types.ObjectId,
  instructorId: Types.ObjectId,
  isAdmin = false
): Promise<boolean> {
  const query: Record<string, unknown> = { _id: courseId };
  if (!isAdmin) query.instructorId = instructorId;

  const course = await Course.findOne(query);
  if (!course) return false;

  const enrollmentCount = await Enrollment.countDocuments({ courseId });
  if (enrollmentCount > 0) {
    throw new AppError(409, 'CONFLICT', 'Cannot delete course with active enrollments');
  }

  await Section.deleteMany({ courseId });
  await Lesson.deleteMany({ courseId });
  await Course.deleteOne({ _id: courseId });
  return true;
}

export async function submitForReview(
  courseId: Types.ObjectId,
  instructorId: Types.ObjectId
): Promise<ICourse | null> {
  const course = await Course.findOneAndUpdate(
    { _id: courseId, instructorId, status: 'draft' },
    { status: 'pending_review' },
    { new: true }
  );
  return toCourse(course);
}

export async function publishCourse(courseId: Types.ObjectId): Promise<ICourse | null> {
  const course = await Course.findOneAndUpdate(
    { _id: courseId, status: 'pending_review' },
    { status: 'published' },
    { new: true }
  );
  return toCourse(course);
}

export async function unpublishCourse(courseId: Types.ObjectId): Promise<ICourse | null> {
  const course = await Course.findOneAndUpdate(
    { _id: courseId, status: 'published' },
    { status: 'unpublished' },
    { new: true }
  );
  return toCourse(course);
}

export async function recalculateCourseStats(courseId: Types.ObjectId): Promise<void> {
  const [_sections, lessons] = await Promise.all([
    Section.find({ courseId }),
    Lesson.find({ courseId }),
  ]);

  const totalLessons = lessons.length;
  const totalDurationSec = lessons.reduce((sum, l) => sum + (l.durationSec || 0), 0);

  await Course.findByIdAndUpdate(courseId, {
    totalLessons,
    totalDurationSec,
    comingSoon: isComingSoon(totalLessons),
  });
}

export async function createSection(courseId: Types.ObjectId, title: string, order?: number): Promise<ISection> {
  const maxOrder = await Section.findOne({ courseId }).sort({ order: -1 }).select('order').lean();
  const section = await Section.create({
    courseId,
    title,
    order: order ?? (maxOrder?.order ?? -1) + 1,
  });
  return toSection(section) as ISection;
}

export async function updateSection(sectionId: Types.ObjectId, input: { title?: string; order?: number }): Promise<ISection | null> {
  const section = await Section.findByIdAndUpdate(sectionId, input, { new: true, runValidators: true });
  return toSection(section);
}

export async function deleteSection(sectionId: Types.ObjectId): Promise<void> {
  await Lesson.deleteMany({ sectionId });
  await Section.findByIdAndDelete(sectionId);
}

export async function createLesson(
  courseId: Types.ObjectId,
  sectionId: Types.ObjectId,
  input: {
    title: string;
    type: 'video' | 'quiz' | 'text';
    isFreePreview?: boolean;
    videoAssetId?: Types.ObjectId;
    quizId?: Types.ObjectId;
    textContent?: string;
  }
): Promise<ILesson> {
  const maxOrder = await Lesson.findOne({ sectionId }).sort({ order: -1 }).select('order').lean();
  const lesson = await Lesson.create({
    courseId,
    sectionId,
    ...input,
    order: (maxOrder?.order ?? -1) + 1,
  });
  await recalculateCourseStats(courseId);
  return toLesson(lesson) as ILesson;
}

export async function updateLesson(
  lessonId: Types.ObjectId,
  input: Partial<{
    title: string;
    type: 'video' | 'quiz' | 'text';
    isFreePreview: boolean;
    videoAssetId: Types.ObjectId;
    quizId: Types.ObjectId;
    textContent: string;
    durationSec: number;
  }>
): Promise<ILesson | null> {
  const lesson = await Lesson.findByIdAndUpdate(lessonId, input, { new: true, runValidators: true });
  if (lesson) await recalculateCourseStats(lesson.courseId);
  return toLesson(lesson);
}

export async function deleteLesson(lessonId: Types.ObjectId): Promise<void> {
  const lesson = await Lesson.findById(lessonId);
  if (lesson) {
    await Lesson.findByIdAndDelete(lessonId);
    await recalculateCourseStats(lesson.courseId);
  }
}

export async function reorderCourseContent(
  courseId: Types.ObjectId,
  input: ReorderInput
): Promise<void> {
  for (const sectionInput of input.sections) {
    await Section.findByIdAndUpdate(sectionInput.id, { order: sectionInput.order });
    for (const lessonInput of sectionInput.lessons) {
      await Lesson.findByIdAndUpdate(lessonInput.id, { order: lessonInput.order });
    }
  }
}

export async function getCourseCurriculum(courseId: Types.ObjectId) {
  const sections = await Section.find({ courseId }).sort({ order: 1 });
  const sectionIds = sections.map(s => s._id);
  const lessons = await Lesson.find({ sectionId: { $in: sectionIds } }).sort({ order: 1 });
  
  const lessonsBySection = lessons.reduce((acc, lesson) => {
    const sectionId = lesson.sectionId.toString();
    const lessonObj = toLesson(lesson);
    if (!lessonObj) return acc;
    if (!acc[sectionId]) acc[sectionId] = [];
    acc[sectionId].push(lessonObj);
    return acc;
  }, {} as Record<string, ILesson[]>);
  
  return sections.map(section => ({
    ...toSection(section),
    lessons: lessonsBySection[section._id.toString()] || [],
  }));
}
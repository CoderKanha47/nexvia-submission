import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '../server/src/config/env';
import { disconnectRedis } from '../server/src/config/redis';
import { UserModel } from '../server/src/models/user.model';
import { Course } from '../server/src/models/Course';
import { Section } from '../server/src/models/Section';
import { Lesson } from '../server/src/models/Lesson';
import { QuizModel } from '../server/src/models/quiz.model';
import { Enrollment } from '../server/src/models/Enrollment';
import { LessonProgress } from '../server/src/models/LessonProgress';
import { VideoAssetModel } from '../server/src/models/video-asset.model';
import { EarningsLedgerModel, OrderModel, PaymentModel } from '../server/src/models/payment.model';
import { CATALOG, generateSlug, LIVE_SLUGS } from './lib/catalog';
import { COURSE_LESSONS, COURSE_QUIZZES } from './lib/course-content';
import { ensureSampleVideosProcessed, printClipResults, SAMPLE_CLIPS } from './lib/sample-videos';
import { seedDemoEnrollments } from './lib/enrollments';

const ACCOUNTS = {
  admin: { name: 'Admin User', email: 'admin@gmail.com', role: 'admin' as const },
  instructors: [
    { name: 'Instructor One', email: 'instructor1@gmail.com', track: 'web' as const },
    { name: 'Instructor Two', email: 'instructor2@gmail.com', track: 'data' as const },
    { name: 'Instructor Three', email: 'instructor3@gmail.com', track: 'ops' as const },
  ],
  students: [
    'Alice', 'Alisha', 'Bob', 'Cathy', 'Danny', 'Debendra', 'Kanha', 'Krish', 'Monty', 'Zia',
  ].map((name) => ({ name, email: `${name.toLowerCase()}@gmail.com` })),
};

/** Removes demo rows the API can no longer produce: enrollments/payments for courses with no lessons. */
async function cleanupInvalidDemoData(): Promise<{ enrollments: number; payments: number }> {
  const courses = await Course.find({}).select('_id').lean();
  if (courses.length === 0) return { enrollments: 0, payments: 0 };

  const grouped = await Lesson.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
    { $group: { _id: '$courseId', n: { $sum: 1 } } },
  ]);
  const counts = new Map(grouped.map((g) => [String(g._id), g.n]));
  const soonIds = courses.filter((c) => (counts.get(String(c._id)) ?? 0) === 0).map((c) => c._id);
  if (soonIds.length === 0) return { enrollments: 0, payments: 0 };

  const badEnrollments = await Enrollment.find({ courseId: { $in: soonIds } })
    .select('userId courseId')
    .lean();
  const keys = badEnrollments.map((e) => ({ userId: e.userId, courseId: e.courseId }));
  if (keys.length === 0) return { enrollments: 0, payments: 0 };

  const badPayments = await PaymentModel.find({ $or: keys }).select('_id').lean();
  if (badPayments.length > 0) {
    const ids = badPayments.map((p) => p._id);
    await EarningsLedgerModel.deleteMany({ orderId: { $in: ids } });
    await PaymentModel.deleteMany({ _id: { $in: ids } });
  }
  await OrderModel.deleteMany({ $or: keys });
  await LessonProgress.deleteMany({ $or: keys });
  await Enrollment.deleteMany({ _id: { $in: badEnrollments.map((e) => e._id) } });

  return { enrollments: badEnrollments.length, payments: badPayments.length };
}

async function upsertUsers() {
  const passwordHash = await bcrypt.hash('password123', 10);
  const admin = await UserModel.findOneAndUpdate(
    { email: ACCOUNTS.admin.email },
    { ...ACCOUNTS.admin, passwordHash, isActive: true },
    { upsert: true, new: true },
  );
  const instructors = await Promise.all(
    ACCOUNTS.instructors.map((inst) =>
      UserModel.findOneAndUpdate(
        { email: inst.email },
        { name: inst.name, email: inst.email, passwordHash, role: 'instructor', isActive: true },
        { upsert: true, new: true },
      ),
    ),
  );
  const students = await Promise.all(
    ACCOUNTS.students.map((s) =>
      UserModel.findOneAndUpdate(
        { email: s.email },
        { ...s, passwordHash, role: 'student', isActive: true },
        { upsert: true, new: true },
      ),
    ),
  );
  const trackToInstructor = {
    web: instructors[0]!._id as mongoose.Types.ObjectId,
    data: instructors[1]!._id as mongoose.Types.ObjectId,
    ops: instructors[2]!._id as mongoose.Types.ObjectId,
  };
  console.log(`Users: admin ${admin.email}, ${instructors.length} instructors, ${students.length} students`);
  return { students, trackToInstructor };
}

async function upsertCatalog(trackToInstructor: Record<string, mongoose.Types.ObjectId>) {
  const bySlug = new Map<string, mongoose.Types.ObjectId>();
  for (let i = 0; i < CATALOG.length; i++) {
    const c = CATALOG[i]!;
    const slug = generateSlug(c.title, i);
    const doc = await Course.findOneAndUpdate(
      { slug },
      {
        $set: {
          title: c.title,
          slug,
          description: c.description,
          category: c.category,
          level: c.level,
          priceCents: c.priceCents,
          currency: 'INR',
          status: 'published',
          tags: c.tags,
          instructorId: trackToInstructor[c.instructor]!,
          comingSoon: !c.live,
          thumbnailUrl: c.thumbnail ?? null,
        },
        $setOnInsert: { totalLessons: 0, totalDurationSec: 0 },
      },
      { upsert: true, new: true },
    );
    bySlug.set(slug, doc._id as mongoose.Types.ObjectId);
  }
  console.log(`Catalog: ${CATALOG.length} courses upserted (${LIVE_SLUGS.length} live)`);
  return bySlug;
}

async function buildLiveCourses(
  courseIds: Map<string, mongoose.Types.ObjectId>,
  clips: Awaited<ReturnType<typeof ensureSampleVideosProcessed>>,
) {
  const clipByName = new Map(clips.map((c) => [c.name, c]));
  let built = 0;

  for (let courseIdx = 0; courseIdx < LIVE_SLUGS.length; courseIdx++) {
    const slug = LIVE_SLUGS[courseIdx]!;
    const plan = COURSE_LESSONS[slug];
    const courseId = courseIds.get(slug);
    if (!plan || !courseId) throw new Error(`Missing lesson plan or course for ${slug}`);

    await Lesson.deleteMany({ courseId });
    await Section.deleteMany({ courseId });
    await QuizModel.deleteMany({ courseId });
    // Lesson ids change on rebuild, so lesson progress must be rebuilt too.
    await LessonProgress.deleteMany({ courseId });
    await Enrollment.updateMany({ courseId }, { $set: { progressPct: 0, completedAt: null } });

    let totalLessons = 0;
    let totalDurationSec = 0;
    for (let s = 0; s < plan.length; s++) {
      const section = await Section.create({ courseId, title: plan[s]!.section, order: s });
      for (let l = 0; l < plan[s]!.lessons.length; l++) {
        const clipName = SAMPLE_CLIPS[(courseIdx * 2 + s * 3 + l) % SAMPLE_CLIPS.length]!;
        const clip = clipByName.get(clipName);
        if (!clip || clip.durationSec <= 0) throw new Error(`No processed clip ${clipName} for ${slug}`);
        await Lesson.create({
          courseId,
          sectionId: section._id,
          title: plan[s]!.lessons[l]!.title,
          order: l,
          type: 'video',
          videoAssetId: clip.assetId,
          isFreePreview: s === 0 && l === 0,
          durationSec: clip.durationSec,
        });
        totalLessons++;
        totalDurationSec += clip.durationSec;
      }
    }

    const questions = COURSE_QUIZZES[slug];
    if (!questions || questions.length !== 4) throw new Error(`Expected 4 quiz questions for ${slug}`);
    await QuizModel.create({
      courseId,
      title: 'Final Assessment',
      passMarkPct: 70,
      questions: questions.map((q, qi) => ({
        id: `q${qi + 1}`,
        type: 'single',
        text: q.text,
        options: q.options.map((opt, oi) => ({ id: `q${qi + 1}_${oi}`, text: opt.text })),
        correctOptionIds: q.options
          .map((opt, oi) => (opt.isCorrect ? `q${qi + 1}_${oi}` : null))
          .filter((id): id is string => id !== null),
        points: 10,
        explanation: q.explanation,
      })),
    });

    await Course.findByIdAndUpdate(courseId, {
      totalLessons,
      totalDurationSec,
      comingSoon: false,
    });
    built++;
    console.log(`  live: ${slug} — ${totalLessons} lessons, ${totalDurationSec}s`);
  }
  return built;
}

async function deleteUnreferencedAssets(): Promise<number> {
  const referenced = await Lesson.distinct('videoAssetId', { videoAssetId: { $ne: null } });
  const stale = await VideoAssetModel.find({ _id: { $nin: referenced } });
  for (const asset of stale) {
    rmSync(join(env.HLS_DIR, String(asset.id)), { recursive: true, force: true });
    rmSync(join(env.UPLOAD_DIR, 'uploads', String(asset.id)), { recursive: true, force: true });
    await asset.deleteOne();
  }
  return stale.length;
}

async function main() {
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected to MongoDB');

  const { students, trackToInstructor } = await upsertUsers();

  const cleaned = await cleanupInvalidDemoData();
  if (cleaned.enrollments > 0) {
    console.log(`Cleanup: removed ${cleaned.enrollments} enrollments + ${cleaned.payments} payments tied to coming-soon courses`);
  }

  const courseIds = await upsertCatalog(trackToInstructor);
  const liveCourseId = courseIds.get(LIVE_SLUGS[0])!;

  console.log('\nProcessing sample videos through the BullMQ pipeline...');
  const clips = await ensureSampleVideosProcessed({
    ownerId: trackToInstructor.web!,
    courseId: liveCourseId,
  });
  printClipResults(clips);

  console.log('\nBuilding live course content...');
  const built = await buildLiveCourses(courseIds, clips);
  const removedAssets = await deleteUnreferencedAssets();
  if (removedAssets > 0) console.log(`Removed ${removedAssets} superseded video asset(s)`);

  const liveCourses = await Course.find({ slug: { $in: LIVE_SLUGS } })
    .select('_id instructorId priceCents currency')
    .lean();
  const stats = await seedDemoEnrollments(
    liveCourses.map((c) => ({
      _id: c._id as mongoose.Types.ObjectId,
      instructorId: c.instructorId as mongoose.Types.ObjectId,
      priceCents: c.priceCents,
      currency: c.currency,
    })),
    students.map((s) => ({ _id: s._id as mongoose.Types.ObjectId })),
  );

  console.log('\n=== SEED COMPLETE ===');
  console.log(`Catalog: ${CATALOG.length} courses — ${LIVE_SLUGS.length} live, ${CATALOG.length - LIVE_SLUGS.length} coming soon`);
  console.log(`Live courses built: ${built}`);
  console.log(`Demo data: ${stats.enrollments} enrollments, ${stats.payments} payments, ${stats.lessonProgress} lesson progress rows`);
  console.log('Demo credentials:');
  console.log('  Admin: admin@gmail.com / password123');
  console.log('  Instructors: instructor1/2/3@gmail.com / password123');
  console.log(`  Students: ${ACCOUNTS.students.map((s) => s.email).join(', ')} / password123`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // The shared transcode Queue holds a duplicated Redis connection until closed.
    const { transcodeQueue } = await import('../server/src/config/queue');
    await transcodeQueue.close().catch(() => undefined);
    await mongoose.disconnect();
    await disconnectRedis().catch(() => undefined);
    console.log('Disconnected');
    process.exit(process.exitCode ?? 0);
  });

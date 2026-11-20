import type { Types } from 'mongoose';
import { Enrollment } from '../../server/src/models/Enrollment';
import { Lesson } from '../../server/src/models/Lesson';
import { LessonProgress } from '../../server/src/models/LessonProgress';
import { EarningsLedgerModel, PaymentModel } from '../../server/src/models/payment.model';
import { calculateFees } from '../../server/src/services/payment.service';

export interface DemoCourse {
  _id: Types.ObjectId;
  instructorId: Types.ObjectId;
  priceCents: number;
  currency: string;
}

export interface DemoStudent {
  _id: Types.ObjectId;
}

export interface EnrollmentSeedStats {
  enrollments: number;
  payments: number;
  lessonProgress: number;
}

const PROGRESSION = [100, 60, 30, 0];

/**
 * Deterministic demo data: every student is enrolled in two live courses with
 * a fixed progression. Coming-soon courses are never enrolled into (the API
 * rejects those). Idempotent — upserts only, nothing is deleted here.
 */
export async function seedDemoEnrollments(
  liveCourses: DemoCourse[],
  students: DemoStudent[],
): Promise<EnrollmentSeedStats> {
  const stats: EnrollmentSeedStats = { enrollments: 0, payments: 0, lessonProgress: 0 };
  if (liveCourses.length === 0) return stats;

  for (let i = 0; i < students.length; i++) {
    const student = students[i]!;
    const picks = [liveCourses[i % liveCourses.length]!, liveCourses[(i + 1) % liveCourses.length]!];

    for (let s = 0; s < picks.length; s++) {
      const course = picks[s]!;
      const pct = PROGRESSION[(i + s) % PROGRESSION.length]!;
      const enrolledAt = new Date(Date.now() - (((i * 7 + s * 3) % 180) + 1) * 86_400_000);

      const enrollment = await Enrollment.findOneAndUpdate(
        { userId: student._id, courseId: course._id },
        {
          $set: {
            enrolledAt,
            progressPct: pct,
            completedAt: pct === 100 ? new Date(enrolledAt.getTime() + 10 * 86_400_000) : null,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      stats.enrollments++;

      if (course.priceCents > 0) {
        const payment = await PaymentModel.findOneAndUpdate(
          { userId: student._id, courseId: course._id },
          {
            $setOnInsert: {
              userId: student._id,
              courseId: course._id,
              amountCents: course.priceCents,
              currency: course.currency.toLowerCase(),
              status: 'SUCCEEDED',
              gateway: 'PAYNEXT',
              transactionId: `PNX_SEED_${student._id}_${course._id}`,
              paymentMethod: 'card',
              cardLast4: '4242',
            },
          },
          { upsert: true, new: true },
        );
        stats.payments++;

        if (String(enrollment.orderId ?? '') !== String(payment._id)) {
          enrollment.orderId = payment._id;
          await enrollment.save();
        }

        const { platformFeeCents, netCents } = calculateFees(course.priceCents);
        await EarningsLedgerModel.findOneAndUpdate(
          { orderId: payment._id },
          {
            $setOnInsert: {
              instructorId: course.instructorId,
              courseId: course._id,
              orderId: payment._id,
              grossCents: course.priceCents,
              platformFeeCents,
              netCents,
              status: 'available',
            },
          },
          { upsert: true },
        );
      }

      const lessons = await Lesson.find({ courseId: course._id }).sort({ order: 1 }).select('_id durationSec');
      const doneCount = Math.round((pct / 100) * lessons.length);
      for (let li = 0; li < lessons.length; li++) {
        const lesson = lessons[li]!;
        const completed = li < doneCount;
        await LessonProgress.findOneAndUpdate(
          { userId: student._id, lessonId: lesson._id },
          {
            $set: {
              completed,
              lastPositionSec: completed ? lesson.durationSec || 0 : 0,
              ...(completed ? { completedAt: new Date() } : {}),
            },
            $setOnInsert: { courseId: course._id },
          },
          { upsert: true },
        );
        stats.lessonProgress++;
      }
    }
  }

  return stats;
}

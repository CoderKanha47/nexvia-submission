import { Types } from 'mongoose';
import { EventEmitter } from 'node:events';
import { AppError } from '../utils/errors';
import { PaymentModel, EarningsLedgerModel } from '../models/payment.model';
import { calculateFees } from './payment.service';
import { Enrollment } from '../models';
import { Course } from '../models';
import { UserModel } from '../models/user.model';
import { assertCourseIsLive } from './course.service';

export interface PayForCourseResult {
  paymentId: string;
  transactionId: string;
  enrolled: boolean;
}

export const paynextEvents = new EventEmitter();
paynextEvents.setMaxListeners(100);

function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PNX_${timestamp}_${random}`;
}

export async function payForCourse(
  userId: string,
  courseId: string,
): Promise<PayForCourseResult> {
  const user = await UserModel.findById(userId);
  if (!user || !user.isActive) {
    throw new AppError(401, 'UNAUTHORIZED', 'User not found or inactive');
  }
  if (user.role !== 'student') {
    throw new AppError(403, 'FORBIDDEN', 'Only students can enroll in courses');
  }

  const course = await Course.findById(courseId);
  if (!course) throw new AppError(404, 'NOT_FOUND', 'Course not found');
  if (course.status !== 'published') throw new AppError(403, 'FORBIDDEN', 'Course is not published');
  await assertCourseIsLive(new Types.ObjectId(courseId));

  const existingEnrollment = await Enrollment.findOne({ userId, courseId });
  if (existingEnrollment) {
    const existingPayment = await PaymentModel.findOne({ userId, courseId, status: 'SUCCEEDED' });
    return {
      paymentId: existingPayment?._id?.toString() ?? existingEnrollment._id.toString(),
      transactionId: existingPayment?.transactionId ?? 'ENROLLED',
      enrolled: true,
    };
  }

  if (course.priceCents === 0) {
    await Enrollment.findOneAndUpdate(
      { userId, courseId },
      { $setOnInsert: { userId, courseId, enrolledAt: new Date(), progressPct: 0 } },
      { upsert: true, new: true }
    );
    return {
      paymentId: 'FREE',
      transactionId: 'FREE_ENROLLMENT',
      enrolled: true,
    };
  }

  const transactionId = generateTransactionId();
  const payment = await PaymentModel.create({
    userId,
    courseId,
    amountCents: course.priceCents,
    currency: course.currency.toLowerCase(),
    status: 'SUCCEEDED',
    gateway: 'PAYNEXT',
    transactionId,
    paymentMethod: 'card',
  });

  await Enrollment.findOneAndUpdate(
    { userId, courseId },
    { $setOnInsert: { userId, courseId, enrolledAt: new Date(), progressPct: 0 } },
    { upsert: true, new: true }
  );

  const courseDoc = await Course.findById(payment.courseId);
  if (courseDoc) {
    const { platformFeeCents, netCents } = calculateFees(payment.amountCents);
    await EarningsLedgerModel.findOneAndUpdate(
      { orderId: payment._id },
      {
        $setOnInsert: {
          instructorId: courseDoc.instructorId,
          courseId: payment.courseId,
          orderId: payment._id,
          grossCents: payment.amountCents,
          platformFeeCents,
          netCents,
          status: 'available',
        },
      },
      { upsert: true }
    );
  }

  const userDoc = await UserModel.findById(payment.userId);
  if (courseDoc && userDoc) {
    paynextEvents.emit('payment.succeeded', {
      type: 'payment.succeeded',
      message: `New enrollment: ${userDoc.name} bought ${courseDoc.title}`,
      paymentId: payment.id,
      transactionId: payment.transactionId,
      userName: userDoc.name,
      userEmail: userDoc.email,
      courseTitle: courseDoc.title,
      amountCents: payment.amountCents,
      timestamp: Date.now(),
    });
  }

  return {
    paymentId: payment.id,
    transactionId: payment.transactionId,
    enrolled: true,
  };
}

export async function getPaymentsByUser(userId: string) {
  return PaymentModel.find({ userId }).sort({ createdAt: -1 }).lean();
}

export async function getPaymentsByCourse(courseId: string) {
  return PaymentModel.find({ courseId }).sort({ createdAt: -1 }).lean();
}

export async function getAllPayments() {
  return PaymentModel.find()
    .sort({ createdAt: -1 })
    .populate('userId', 'name email')
    .populate('courseId', 'title instructorId')
    .lean();
}

export async function getPaymentsByInstructor(instructorId: string) {
  const courses = await Course.find({ instructorId }).select('_id').lean();
  const courseIds = courses.map(c => c._id);
  return PaymentModel.find({ courseId: { $in: courseIds } })
    .sort({ createdAt: -1 })
    .populate('userId', 'name email')
    .populate('courseId', 'title')
    .lean();
}
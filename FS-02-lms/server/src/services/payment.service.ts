import Stripe from 'stripe';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { OrderModel, EarningsLedgerModel, PayoutModel, PaymentModel } from '../models/payment.model';
import { Enrollment } from '../models';
import { Course } from '../models';
import { UserModel } from '../models/user.model';
import { assertCourseIsLive } from './course.service';

const hasStripeKey = !!env.STRIPE_SECRET_KEY;
export const stripeEnabled = hasStripeKey && !env.STRIPE_TEST_MODE;

export const stripe = stripeEnabled
  ? new Stripe(env.STRIPE_SECRET_KEY!, { apiVersion: '2026-10-28.endive' })
  : null;

const PLATFORM_FEE_PCT = Number(env.PLATFORM_FEE_PCT || 20);

export function calculateFees(grossCents: number): { platformFeeCents: number; netCents: number } {
  const platformFeeCents = Math.round((grossCents * PLATFORM_FEE_PCT) / 100);
  const netCents = grossCents - platformFeeCents;
  return { platformFeeCents, netCents };
}

export async function createCheckoutSession(
  userId: string,
  courseId: string,
): Promise<{ checkoutUrl?: string; enrolled?: boolean; demoCheckoutUrl?: string }> {
  const course = await Course.findById(courseId);
  if (!course) throw new AppError(404, 'NOT_FOUND', 'Course not found');
  if (course.status !== 'published') throw new AppError(403, 'FORBIDDEN', 'Course is not published');
  await assertCourseIsLive(new Types.ObjectId(courseId));

  const existing = await Enrollment.findOne({ userId, courseId });
  if (existing) return { enrolled: true };

  if (course.priceCents === 0) {
    await enrollUser(userId, courseId, undefined);
    return { enrolled: true };
  }

  const order = await OrderModel.create({
    userId,
    courseId,
    amountCents: course.priceCents,
    currency: course.currency.toLowerCase(),
    status: 'pending',
  });

  if (stripe) {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: course.currency.toLowerCase(),
            product_data: { name: course.title },
            unit_amount: course.priceCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${env.CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.CLIENT_URL}/checkout/cancel`,
      metadata: { orderId: order.id.toString() },
    });
    order.stripeSessionId = session.id;
    await order.save();
    return { checkoutUrl: session.url ?? undefined };
  }

  // Test mode: simulate a completed checkout locally
  return { demoCheckoutUrl: `${env.CLIENT_URL}/checkout/demo?orderId=${order.id}` };
}

export async function enrollUser(
  userId: string,
  courseId: string,
  orderId?: Types.ObjectId,
): Promise<void> {
  const existing = await Enrollment.findOne({ userId, courseId });
  if (existing) return;
  await Enrollment.create({ userId, courseId, orderId, enrolledAt: new Date(), progressPct: 0 });

  if (orderId) {
    const course = await Course.findById(courseId);
    if (course) {
      const order = await OrderModel.findById(orderId);
      if (order) {
        const { platformFeeCents, netCents } = calculateFees(order.amountCents);
        await EarningsLedgerModel.updateOne(
          { orderId: order._id },
          {
            $setOnInsert: {
              instructorId: course.instructorId,
              courseId,
              orderId: order._id,
              grossCents: order.amountCents,
              platformFeeCents,
              netCents,
              status: 'available',
            },
          },
          { upsert: true },
        );
      }
    }
  }
}

/**
 * Handle a Stripe webhook event. Idempotent: replaying the same session/order
 * leaves the DB unchanged. Signature is verified when STRIPE_TEST_MODE is off.
 */
export async function handleWebhook(rawBody: string | Buffer, signature?: string): Promise<void> {
  let event: Stripe.Event;

  if (stripe) {
    if (!signature) throw new AppError(400, 'VALIDATION_ERROR', 'Missing stripe signature');
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET ?? '');
  } else {
    event = JSON.parse(rawBody.toString()) as Stripe.Event;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (!orderId) return;
    await markOrderPaid(orderId, session.payment_intent?.toString());
  }
}

export async function markOrderPaid(orderId: string, paymentIntentId?: string): Promise<void> {
  const order = await OrderModel.findById(orderId);
  if (!order) return;
  if (order.status === 'paid') return; // idempotent

  order.status = 'paid';
  if (paymentIntentId) order.stripePaymentIntentId = paymentIntentId;
  await order.save();

  await enrollUser(order.userId.toString(), order.courseId.toString(), order._id);
}

// ---- Earnings ----

export interface EarningsSummary {
  grossCents: number;
  feeCents: number;
  netCents: number;
  availableCents: number;
  paidOutCents: number;
}

export async function getEarningsSummary(instructorId: string): Promise<EarningsSummary> {
  const ledger = await EarningsLedgerModel.find({ instructorId });
  let grossCents = 0;
  let feeCents = 0;
  let netCents = 0;
  let availableCents = 0;
  let paidOutCents = 0;
  for (const entry of ledger) {
    grossCents += entry.grossCents;
    feeCents += entry.platformFeeCents;
    netCents += entry.netCents;
    if (entry.status === 'available') availableCents += entry.netCents;
    if (entry.status === 'paid_out') paidOutCents += entry.netCents;
  }
  return { grossCents, feeCents, netCents, availableCents, paidOutCents };
}

export async function getEarningsByCourse(instructorId: string) {
  const ledger = await EarningsLedgerModel.find({ instructorId });
  const courses = await Course.find({ instructorId }).select('title').lean();
  const map = new Map(courses.map((c) => [c._id.toString(), (c as { title: string }).title]));
  const byCourse = new Map<string, { courseId: string; title: string; sales: number; netCents: number }>();
  for (const entry of ledger) {
    const key = entry.courseId.toString();
    const row = byCourse.get(key) ?? {
      courseId: key,
      title: map.get(key) ?? 'Unknown',
      sales: 0,
      netCents: 0,
    };
    row.sales += 1;
    row.netCents += entry.netCents;
    byCourse.set(key, row);
  }
  return [...byCourse.values()];
}

export async function getEarningsMonthly(instructorId: string, months = 12) {
  const ledger = await EarningsLedgerModel.find({ instructorId });
  const counts = new Map<string, { month: string; netCents: number; sales: number }>();
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    counts.set(key, { month: key, netCents: 0, sales: 0 });
  }
  for (const entry of ledger) {
    const created = entry.createdAt ?? entry.updatedAt ?? new Date();
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
    const row = counts.get(key);
    if (row) {
      row.netCents += entry.netCents;
      row.sales += 1;
    }
  }
  return [...counts.values()];
}

export async function getTransactions(instructorId: string, page = 1, limit = 20) {
  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const [rows, total] = await Promise.all([
    EarningsLedgerModel.find({ instructorId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    EarningsLedgerModel.countDocuments({ instructorId }),
  ]);
  return { transactions: rows, meta: { page, limit, total } };
}

export async function requestPayout(
  instructorId: string,
  amountCents: number,
): Promise<void> {
  const { availableCents } = await getEarningsSummary(instructorId);
  if (amountCents <= 0 || amountCents > availableCents) {
    throw new AppError(400, 'VALIDATION_ERROR', `Amount exceeds available balance (${availableCents})`);
  }
  const payout = await PayoutModel.create({
    instructorId,
    amountCents,
    status: 'requested',
    requestedAt: new Date(),
  });
  await EarningsLedgerModel.updateMany(
    { instructorId, status: 'available' },
    { $set: { status: 'paid_out', payoutId: payout._id } },
  );
}

export async function markPayoutPaid(payoutId: string): Promise<void> {
  const payout = await PayoutModel.findByIdAndUpdate(
    payoutId,
    { $set: { status: 'paid', paidAt: new Date() } },
    { new: true },
  );
  if (!payout) throw new AppError(404, 'NOT_FOUND', 'Payout not found');
}

export async function getPayouts(status?: string) {
  const q: Record<string, unknown> = {};
  if (status) q.status = status;
  return PayoutModel.find(q).sort({ requestedAt: -1 }).lean();
}

export async function getMyOrders(userId: string) {
  return OrderModel.find({ userId }).sort({ createdAt: -1 }).lean();
}

export async function getInstructorPayments(instructorId: string) {
  const payments = await PaymentModel.aggregate([
    {
      $lookup: {
        from: 'courses',
        localField: 'courseId',
        foreignField: '_id',
        as: 'course',
      },
    },
    { $unwind: '$course' },
    { $match: { 'course.instructorId': new Types.ObjectId(instructorId) } },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    { $sort: { createdAt: -1 } },
    {
      $project: {
        _id: 1,
        userId: 1,
        courseId: 1,
        amountCents: 1,
        currency: 1,
        status: 1,
        gateway: 1,
        transactionId: 1,
        createdAt: 1,
        'user.name': 1,
        'user.email': 1,
        'course.title': 1,
      },
    },
  ]);

  return payments.map((p: { _id: Types.ObjectId; userId: Types.ObjectId; courseId: Types.ObjectId; amountCents: number; currency: string; status: string; gateway: string; transactionId: string; createdAt: Date; user: { name: string; email: string }; course: { title: string } }) => ({
    id: p._id.toString(),
    userId: p.userId.toString(),
    userName: p.user.name,
    userEmail: p.user.email,
    courseId: p.courseId.toString(),
    courseTitle: p.course.title,
    amountCents: p.amountCents,
    currency: p.currency,
    status: p.status,
    gateway: p.gateway,
    transactionId: p.transactionId,
    createdAt: p.createdAt.toISOString(),
    user: { name: p.user.name, email: p.user.email },
    course: { title: p.course.title },
  }));
}

/** Admin stats for the dashboard. */
export async function getAdminStats() {
  const [users, courses, enrollments, orders] = await Promise.all([
    UserModel.countDocuments(),
    Course.countDocuments(),
    Enrollment.countDocuments(),
    OrderModel.find({ status: 'paid' }).lean(),
  ]);
  const revenue = orders.reduce((s, o) => s + o.amountCents, 0);
  const pending = await Course.countDocuments({ status: 'pending_review' });
  return { users, courses, enrollments, revenueCents: revenue, pendingReviewCourses: pending };
}
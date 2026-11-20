export interface CheckoutResult {
  checkoutUrl?: string;
  enrolled?: boolean;
  demoCheckoutUrl?: string;
}

export interface Order {
  id: string;
  userId: string;
  courseId: string;
  amountCents: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayNextPayResult {
  paymentId: string;
  transactionId: string;
  enrolled: boolean;
}

export interface Payment {
  id: string;
  userId: string;
  courseId: string;
  amountCents: number;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  gateway: 'PAYNEXT' | 'STRIPE';
  transactionId: string;
  cardLast4?: string;
  paymentMethod: 'card' | 'upi';
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  user?: { name: string; email: string };
  course?: { title: string; instructorId?: string };
}

export interface EarningsSummary {
  grossCents: number;
  feeCents: number;
  netCents: number;
  availableCents: number;
  paidOutCents: number;
}

export interface EarningsByCourse {
  courseId: string;
  title: string;
  sales: number;
  netCents: number;
}

export interface EarningsMonthly {
  month: string;
  netCents: number;
  sales: number;
}

export interface Transaction {
  id: string;
  instructorId: string;
  courseId: string;
  orderId: string;
  grossCents: number;
  platformFeeCents: number;
  netCents: number;
  status: 'pending' | 'available' | 'paid_out';
  payoutId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutRequest {
  amountCents: number;
}

export interface AdminStats {
  users: number;
  courses: number;
  enrollments: number;
  revenueCents: number;
  pendingReviewCourses: number;
}

export interface AdminPayment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  instructorName: string;
  amountCents: number;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  gateway: 'PAYNEXT' | 'STRIPE';
  transactionId: string;
  createdAt: string;
}

export interface AdminActivity {
  id: string;
  type: 'payment.succeeded' | 'enrollment.created' | 'course.published';
  message: string;
  createdAt: string;
}
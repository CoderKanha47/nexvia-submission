import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const ORDER_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    amountCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'inr', lowercase: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: unknown, ret: unknown) => {
        const r = ret as Record<string, unknown>;
        delete r._id;
        delete r.__v;
        return r;
      },
    },
  },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ courseId: 1 });
orderSchema.index({ stripeSessionId: 1 });

export type OrderSchemaType = InferSchemaType<typeof orderSchema>;
export type OrderDoc = HydratedDocument<OrderSchemaType>;

export const OrderModel = model('Order', orderSchema);

// PayNext Payment model
export const PAYMENT_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_GATEWAYS = ['PAYNEXT', 'STRIPE'] as const;
export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[number];

const paymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    amountCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'inr', lowercase: true },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'PENDING' },
    gateway: { type: String, enum: PAYMENT_GATEWAYS, default: 'PAYNEXT' },
    transactionId: { type: String, required: true, unique: true },
    cardLast4: { type: String },
    paymentMethod: { type: String, enum: ['card', 'upi'] },
    failureReason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: unknown, ret: unknown) => {
        const r = ret as Record<string, unknown>;
        delete r._id;
        delete r.__v;
        return r;
      },
    },
  },
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ courseId: 1 });
paymentSchema.index({ status: 1 });

export type PaymentSchemaType = InferSchemaType<typeof paymentSchema>;
export type PaymentDoc = HydratedDocument<PaymentSchemaType>;

export const PaymentModel = model('Payment', paymentSchema);

export const LEDGER_STATUSES = ['pending', 'available', 'paid_out'] as const;
export type LedgerStatus = (typeof LEDGER_STATUSES)[number];

const ledgerSchema = new Schema(
  {
    instructorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    grossCents: { type: Number, required: true, min: 0 },
    platformFeeCents: { type: Number, required: true, min: 0 },
    netCents: { type: Number, required: true, min: 0 },
    status: { type: String, enum: LEDGER_STATUSES, default: 'pending' },
    payoutId: { type: Schema.Types.ObjectId, ref: 'Payout' },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: unknown, ret: unknown) => {
        const r = ret as Record<string, unknown>;
        delete r._id;
        delete r.__v;
        return r;
      },
    },
  },
);

ledgerSchema.index({ instructorId: 1, status: 1 });

export type EarningsLedgerSchemaType = InferSchemaType<typeof ledgerSchema>;
export type EarningsLedgerDoc = HydratedDocument<EarningsLedgerSchemaType>;

export const EarningsLedgerModel = model('EarningsLedger', ledgerSchema);

export const PAYOUT_STATUSES = ['requested', 'paid'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

const payoutSchema = new Schema(
  {
    instructorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amountCents: { type: Number, required: true, min: 1 },
    status: { type: String, enum: PAYOUT_STATUSES, default: 'requested' },
    requestedAt: { type: Date, default: Date.now },
    paidAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: unknown, ret: unknown) => {
        const r = ret as Record<string, unknown>;
        delete r._id;
        delete r.__v;
        return r;
      },
    },
  },
);

payoutSchema.index({ instructorId: 1, status: 1 });

export type PayoutSchemaType = InferSchemaType<typeof payoutSchema>;
export type PayoutDoc = HydratedDocument<PayoutSchemaType>;

export const PayoutModel = model('Payout', payoutSchema);
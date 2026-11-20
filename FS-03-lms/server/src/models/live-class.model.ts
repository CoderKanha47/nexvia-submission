import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const LIVE_STATUSES = ['scheduled', 'live', 'ended', 'cancelled'] as const;
export type LiveStatus = (typeof LIVE_STATUSES)[number];

const liveClassSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    instructorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    scheduledAt: { type: Date, required: true },
    durationMin: { type: Number, required: true, min: 5 },
    roomName: { type: String, required: true, unique: true },
    status: { type: String, enum: LIVE_STATUSES, default: 'scheduled' },
    startedAt: { type: Date },
    endedAt: { type: Date },
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

liveClassSchema.index({ courseId: 1, status: 1 });
liveClassSchema.index({ scheduledAt: 1 });

export type LiveClassSchemaType = InferSchemaType<typeof liveClassSchema>;
export type LiveClassDoc = HydratedDocument<LiveClassSchemaType>;

export const LiveClassModel = model('LiveClass', liveClassSchema);

const chatMessageSchema = new Schema(
  {
    liveClassId: { type: Schema.Types.ObjectId, ref: 'LiveClass', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    sentAt: { type: Date, default: Date.now },
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

chatMessageSchema.index({ liveClassId: 1, sentAt: -1 });

export type ChatMessageSchemaType = InferSchemaType<typeof chatMessageSchema>;
export type ChatMessageDoc = HydratedDocument<ChatMessageSchemaType>;

export const ChatMessageModel = model('ChatMessage', chatMessageSchema);
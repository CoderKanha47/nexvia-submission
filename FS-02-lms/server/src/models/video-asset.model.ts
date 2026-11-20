import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const VIDEO_STATUSES = ['uploaded', 'queued', 'processing', 'ready', 'failed'] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

const renditionSchema = new Schema(
  {
    name: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    bitrateKbps: { type: Number, required: true },
  },
  { _id: false },
);

const videoAssetSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    courseId: { type: Schema.Types.ObjectId, required: true, ref: 'Course' },
    originalKey: { type: String, required: true },
    status: { type: String, enum: VIDEO_STATUSES, default: 'uploaded' },
    hlsPrefix: { type: String },
    renditions: [renditionSchema],
    durationSec: { type: Number },
    error: { type: String },
    jobId: { type: String },
    progressPct: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: unknown, ret: unknown) => {
        const r = ret as Record<string, unknown>;
        delete r._id;
        delete r.__v;
        return r;
      },
    },
  },
);

export type VideoAssetSchemaType = InferSchemaType<typeof videoAssetSchema>;
export type VideoAssetDoc = HydratedDocument<VideoAssetSchemaType>;

export const VideoAssetModel = model('VideoAsset', videoAssetSchema);

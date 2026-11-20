import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  instructorId: mongoose.Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    instructorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, trim: true },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
    priceCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true },
    thumbnailUrl: { type: String },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'published', 'unpublished'],
      default: 'draft',
    },
    tags: [{ type: String, trim: true }],
    totalLessons: { type: Number, default: 0 },
    totalDurationSec: { type: Number, default: 0 },
    ratingAvg: { type: Number, min: 0, max: 5 },
    comingSoon: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CourseSchema.index({ slug: 1 }, { unique: true });
CourseSchema.index({ status: 1, category: 1 });
CourseSchema.index({ instructorId: 1 });

export const Course = mongoose.model<ICourse>('Course', CourseSchema);
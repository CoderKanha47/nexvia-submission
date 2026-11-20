import mongoose, { Document, Schema } from 'mongoose';

export interface ISection extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<ISection>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

SectionSchema.index({ courseId: 1, order: 1 });

export const Section = mongoose.model<ISection>('Section', SectionSchema);
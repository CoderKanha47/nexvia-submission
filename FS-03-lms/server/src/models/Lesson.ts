import mongoose, { Document, Schema } from 'mongoose';

export type LessonType = 'video' | 'quiz' | 'text';

export interface ILesson extends Document {
  courseId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  title: string;
  order: number;
  type: LessonType;
  videoAssetId?: mongoose.Types.ObjectId;
  quizId?: mongoose.Types.ObjectId;
  textContent?: string;
  isFreePreview: boolean;
  durationSec: number;
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema = new Schema<ILesson>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    type: { type: String, enum: ['video', 'quiz', 'text'], required: true },
    videoAssetId: { type: Schema.Types.ObjectId, ref: 'VideoAsset' },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz' },
    textContent: { type: String },
    isFreePreview: { type: Boolean, default: false },
    durationSec: { type: Number, default: 0 },
  },
  { timestamps: true }
);

LessonSchema.index({ courseId: 1, order: 1 });
LessonSchema.index({ sectionId: 1, order: 1 });

export const Lesson = mongoose.model<ILesson>('Lesson', LessonSchema);
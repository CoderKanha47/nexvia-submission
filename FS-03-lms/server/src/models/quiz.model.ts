import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const QUIZ_TYPES = ['single', 'multi', 'truefalse'] as const;
export type QuizType = (typeof QUIZ_TYPES)[number];

const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: QUIZ_TYPES, required: true },
    text: { type: String, required: true, trim: true },
    options: [
      new Schema(
        {
          id: { type: String, required: true },
          text: { type: String, required: true, trim: true },
        },
        { _id: false },
      ),
    ],
    correctOptionIds: [{ type: String, required: true }],
    points: { type: Number, required: true, min: 1 },
    explanation: { type: String },
  },
  { _id: false },
);

const quizSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true, trim: true },
    passMarkPct: { type: Number, required: true, default: 70, min: 0, max: 100 },
    maxAttempts: { type: Number, min: 1 },
    timeLimitSec: { type: Number, min: 30 },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (v: unknown[]) => v.length > 0,
        message: 'Quiz must have at least one question',
      },
    },
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

quizSchema.index({ courseId: 1 });

export type QuizSchemaType = InferSchemaType<typeof quizSchema>;
export type QuizDoc = HydratedDocument<QuizSchemaType>;

export const QuizModel = model('Quiz', quizSchema);
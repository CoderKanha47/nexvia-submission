import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const answerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    selectedOptionIds: [{ type: String, required: true }],
  },
  { _id: false },
);

const attemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    answers: [answerSchema],
    scorePct: { type: Number, required: true, min: 0, max: 100 },
    pointsEarned: { type: Number, required: true, min: 0 },
    pointsTotal: { type: Number, required: true, min: 0 },
    passed: { type: Boolean, required: true },
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date, required: true },
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

attemptSchema.index({ userId: 1, quizId: 1 });

export type QuizAttemptSchemaType = InferSchemaType<typeof attemptSchema>;
export type QuizAttemptDoc = HydratedDocument<QuizAttemptSchemaType>;

export const QuizAttemptModel = model('QuizAttempt', attemptSchema);
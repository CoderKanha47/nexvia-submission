import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const certificateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    certificateId: { type: String, required: true, unique: true },
    issuedAt: { type: Date, default: Date.now },
    pdfKey: { type: String },
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

certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });
certificateSchema.index({ userId: 1 });

export type CertificateSchemaType = InferSchemaType<typeof certificateSchema>;
export type CertificateDoc = HydratedDocument<CertificateSchemaType>;

export const CertificateModel = model('Certificate', certificateSchema);
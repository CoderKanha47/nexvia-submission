import { Types } from 'mongoose';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { mkdirSync, createWriteStream, existsSync } from 'node:fs';
import PDFDocument from 'pdfkit';
import { env } from '../config/env';
import { CertificateModel } from '../models/certificate.model';
import { Course } from '../models';
import { UserModel } from '../models/user.model';
import { Enrollment } from '../models';
import { AppError } from '../utils/errors';
import { putFile } from './storage.service';

export function generateCertificateId(): string {
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `LMS-${new Date().getFullYear()}-${suffix}`;
}

/**
 * Idempotently issue a certificate for a completed enrollment.
 */
export async function issueCertificateForEnrollment(
  userId: Types.ObjectId,
  courseId: Types.ObjectId,
) {
  const existing = await CertificateModel.findOne({ userId, courseId });
  if (existing) return existing;

  const enrollment = await Enrollment.findOne({ userId, courseId });
  if (!enrollment?.completedAt) {
    throw new AppError(409, 'CONFLICT', 'Course not completed yet');
  }

  const [user, course] = await Promise.all([
    UserModel.findById(userId),
    Course.findById(courseId).populate('instructorId', 'name'),
  ]);
  if (!user || !course) throw new AppError(404, 'NOT_FOUND', 'User or course not found');

  const instructor = course.instructorId as unknown as { name: string } | Types.ObjectId;
  const instructorName =
    typeof instructor === 'object' && instructor !== null && 'name' in instructor
      ? (instructor as { name: string }).name
      : 'LMS Team';

  const certificateId = generateCertificateId();
  const pdfPath = join(env.CERT_DIR, `${certificateId}.pdf`);
  mkdirSync(env.CERT_DIR, { recursive: true });
  await renderCertificatePdf({
    path: pdfPath,
    studentName: user.name,
    courseTitle: course.title,
    instructorName,
    issuedAt: enrollment.completedAt,
    certificateId,
  });

  const storePath = `certificates/${certificateId}.pdf`;
  await putFile(storePath, pdfPath, { contentType: 'application/pdf' });

  return CertificateModel.create({
    userId,
    courseId,
    certificateId,
    issuedAt: enrollment.completedAt,
    pdfKey: storePath,
  });
}

interface RenderInput {
  path: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  issuedAt: Date;
  certificateId: string;
}

async function renderCertificatePdf(input: RenderInput): Promise<void> {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
  const stream = createWriteStream(input.path);
  doc.pipe(stream);

  const W = 841.89;
  const H = 595.28;

  doc.rect(24, 24, W - 48, H - 48).lineWidth(3).strokeColor('#2c5282').stroke();
  doc.rect(30, 30, W - 60, H - 60).lineWidth(1).strokeColor('#e2e8f0').stroke();

  doc
    .fontSize(13)
    .fillColor('#718096')
    .text('CERTIFICATE OF COMPLETION', 0, 110, { align: 'center', characterSpacing: 3 });

  doc
    .fontSize(30)
    .fillColor('#1a202c')
    .text('This certifies that', 0, 170, { align: 'center' });

  doc
    .fontSize(40)
    .fillColor('#2b6cb0')
    .text(input.studentName, 0, 225, { align: 'center' });

  doc
    .fontSize(17)
    .fillColor('#4a5568')
    .text('has successfully completed the course', 0, 290, { align: 'center' });

  doc
    .fontSize(28)
    .fillColor('#1a202c')
    .text(input.courseTitle, 0, 325, { align: 'center' });

  doc
    .fontSize(12)
    .fillColor('#718096')
    .text(`Instructed by ${input.instructorName}`, 0, 390, { align: 'center' });

  doc
    .fontSize(12)
    .fillColor('#4a5568')
    .text(`Issued on ${formatDate(input.issuedAt)}`, 0, 440, { align: 'center' });

  doc
    .fontSize(11)
    .fillColor('#a0aec0')
    .text(`Certificate ID: ${input.certificateId}`, 42, 520, { align: 'left' });

  doc
    .fontSize(11)
    .fillColor('#a0aec0')
    .text(`Verify at ${env.CLIENT_URL}/verify/${input.certificateId}`, 0, 520, {
      align: 'center',
    });

  doc.fontSize(9).fillColor('#a0aec0').text('LMS with Live Classes', 0, 545, { align: 'center' });

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getMyCertificates(userId: Types.ObjectId) {
  return CertificateModel.find({ userId }).sort({ issuedAt: -1 }).lean();
}

export async function getDownloadPath(
  certificateId: string,
  userId: Types.ObjectId,
): Promise<string> {
  const cert = await CertificateModel.findOne({ certificateId, userId });
  if (!cert) throw new AppError(404, 'NOT_FOUND', 'Certificate not found');
  const p = join(env.CERT_DIR, `${cert.certificateId}.pdf`);
  if (!existsSync(p)) throw new AppError(404, 'NOT_FOUND', 'Certificate PDF not generated');
  return `certificates/${cert.certificateId}.pdf`;
}

export async function verifyCertificate(certificateId: string) {
  const cert = await CertificateModel.findOne({ certificateId })
    .populate('userId', 'name')
    .populate('courseId', 'title')
    .lean();
  if (!cert) return null;
  const user = cert.userId as unknown as { name: string };
  const course = cert.courseId as unknown as { title: string };
  return {
    valid: true,
    studentName: user.name,
    courseTitle: course.title,
    issuedAt: cert.issuedAt,
  };
}
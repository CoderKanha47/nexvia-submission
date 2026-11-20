import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { CertificateModel } from '../models/certificate.model';
import { Enrollment } from '../models';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/errors';
import { issueCertificateForEnrollment, verifyCertificate } from '../services/certificate.service';
import { storageSignedUrl } from '../services/storage.service';
import { paramStr } from '../utils/params';

export const generateCertificate = asyncHandler(async (req: Request, res: Response) => {
  const userId = new Types.ObjectId(req.user!.id);
  const courseId = new Types.ObjectId(paramStr(req, 'courseId'));

  const enrollment = await Enrollment.findOne({ userId, courseId });
  if (!enrollment || enrollment.progressPct < 100) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Progress must be 100% to generate certificate');
  }

  const certificate = await issueCertificateForEnrollment(userId, courseId);
  res.status(201).json({ data: certificate.toJSON() });
});

export const verifyCertificateHandler = asyncHandler(async (req: Request, res: Response) => {
  const certificateId = paramStr(req, 'certificateId');
  const cert = await verifyCertificate(certificateId);
  if (!cert) throw new AppError(404, 'NOT_FOUND', 'Certificate not found');
  res.json({ data: cert });
});

export const downloadCertificate = asyncHandler(async (req: Request, res: Response) => {
  const userId = new Types.ObjectId(req.user!.id);
  const certificateId = paramStr(req, 'certificateId');
  const cert = await CertificateModel.findOne({ certificateId, userId }).lean();
  if (!cert) throw new AppError(404, 'NOT_FOUND', 'Certificate not found');

  const url = await storageSignedUrl(cert.pdfKey ?? `certificates/${certificateId}.pdf`);
  if (!url) {
    // Fallback to local download path
    res.download(cert.pdfKey ?? `certificates/${certificateId}.pdf`);
    return;
  }
  res.json({ data: { url } });
});

export const listMyCertificates = asyncHandler(async (req: Request, res: Response) => {
  const userId = new Types.ObjectId(req.user!.id);
  const certificates = await CertificateModel.find({ userId }).sort({ generatedAt: -1 }).lean();
  res.json({ data: certificates });
});
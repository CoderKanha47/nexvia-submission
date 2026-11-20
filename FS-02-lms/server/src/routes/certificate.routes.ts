import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  generateCertificate,
  verifyCertificateHandler,
  downloadCertificate,
  listMyCertificates,
} from '../controllers/certificate.controller';

export const certificateRouter = Router();

certificateRouter.use(requireAuth);

// Student-only endpoints
certificateRouter.get('/mine', requireRole('student'), listMyCertificates);
certificateRouter.post('/generate/:courseId', requireRole('student'), generateCertificate);
certificateRouter.get('/download/:certificateId', requireRole('student'), downloadCertificate);

// Public endpoint
certificateRouter.get('/verify/:certificateId', verifyCertificateHandler);
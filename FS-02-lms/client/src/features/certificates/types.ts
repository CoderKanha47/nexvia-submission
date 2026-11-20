export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  certificateId: string;
  issuedAt: string;
  pdfKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationResult {
  valid: boolean;
  studentName: string;
  courseTitle: string;
  issuedAt: string;
}
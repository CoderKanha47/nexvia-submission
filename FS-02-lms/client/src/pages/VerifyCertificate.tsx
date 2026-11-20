import { useParams } from 'react-router-dom';
import { useVerifyCertificateQuery } from '../features/certificates/api';

export default function VerifyCertificate() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const { data: verification, isLoading, error } = useVerifyCertificateQuery(certificateId ?? '', { skip: !certificateId });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
      </div>
    );
  }

  if (error || !verification || !verification.valid) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-2 2l2 2m-2 2l-2 2m2 2l-2 2" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Certificate Not Found</h1>
          <p className="text-gray-600 mb-6">
            This certificate ID is invalid or the certificate has been revoked.
          </p>
          <p className="text-sm text-gray-500">Certificate ID: {certificateId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Certificate Verified</h1>
        <p className="text-gray-600 mb-6">
          This certificate is valid and was issued by our platform.
        </p>
        <div className="bg-gray-50 rounded-lg p-6 text-left space-y-3">
          <div>
            <p className="text-sm text-gray-500">Certificate ID</p>
            <p className="font-mono text-gray-900">{certificateId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Student Name</p>
            <p className="font-medium text-gray-900">{verification.studentName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Course Title</p>
            <p className="font-medium text-gray-900">{verification.courseTitle}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Issued Date</p>
            <p className="font-medium text-gray-900">{new Date(verification.issuedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
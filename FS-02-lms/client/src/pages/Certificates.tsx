import { Link } from 'react-router-dom';
import { useListMyCertificatesQuery, useGenerateCertificateMutation } from '../features/certificates/api';
import { useListMyEnrollmentsQuery } from '../features/enrollment/api';

export default function Certificates() {
  const { data: certificates, isLoading: certLoading } = useListMyCertificatesQuery();
  const { data: enrollments } = useListMyEnrollmentsQuery();
  const [generateCertificate] = useGenerateCertificateMutation();

  const completedCourses = enrollments?.filter((e: { completedAt?: string }) => e.completedAt) ?? [];

  const handleGenerateAndDownload = async (courseId: string) => {
    try {
      await generateCertificate(courseId).unwrap();
      // The certificate list will auto-refresh due to cache invalidation
    } catch (err) {
      console.error('Failed to generate certificate:', err);
      alert('Failed to generate certificate');
    }
  };

  if (certLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Certificates</h1>
      {certificates && certificates.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="aspect-[4/3] bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center relative">
                <svg className="w-24 h-24 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {cert.pdfKey && (
                  <Link
                    to={`/certificates/${cert.certificateId}/download`}
                    className="absolute bottom-2 right-2 px-2 py-1 bg-white/90 text-indigo-600 text-xs rounded hover:bg-white"
                  >
                    Download
                  </Link>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{cert.courseId}</h3>
                <p className="text-sm text-gray-500 mb-2">Issued on {new Date(cert.issuedAt).toLocaleDateString()}</p>
                <p className="text-sm text-gray-500 mb-4">Certificate ID: {cert.certificateId}</p>
                <div className="flex space-x-2">
                  {cert.pdfKey ? (
                    <Link
                      to={`/certificates/${cert.certificateId}/download`}
                      className="flex-1 py-2 px-4 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 text-center"
                    >
                      Download
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleGenerateAndDownload(cert.courseId)}
                      className="flex-1 py-2 px-4 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                    >
                      Generate
                    </button>
                  )}
                  <Link
                    to={`/verify/${cert.certificateId}`}
                    className="flex-1 py-2 px-4 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 text-center"
                  >
                    Verify
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No certificates yet.</p>
        </div>
      )}
      {completedCourses.length > 0 && (
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Courses Completed (Certificate Not Generated)</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {completedCourses.map((enrollment) => {
              const hasCert = certificates?.some((c) => c.courseId === enrollment.courseId);
              if (hasCert) return null;
              return (
                <div key={enrollment.courseId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-1">{enrollment.course?.title ?? enrollment.courseId}</h3>
                  <p className="text-sm text-gray-500 mb-4">Completed on {new Date(enrollment.completedAt!).toLocaleDateString()}</p>
                  <button
                    onClick={() => handleGenerateAndDownload(enrollment.courseId)}
                    className="w-full py-2 px-4 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                  >
                    Generate Certificate
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
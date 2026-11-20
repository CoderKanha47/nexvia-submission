import { baseApi } from '../../app/api';
import type { Certificate, VerificationResult } from './types';

export const certificatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listMyCertificates: builder.query<Certificate[], void>({
      query: () => '/certificates/mine',
      transformResponse: (response: { data: Certificate[] }) => response.data,
      providesTags: ['Certificate'],
    }),
    generateCertificate: builder.mutation<Certificate, string>({
      query: (courseId) => ({
        url: `/certificates/generate/${courseId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Certificate'],
    }),
    downloadCertificate: builder.query<{ url: string }, string>({
      query: (certificateId) => `/certificates/${certificateId}/download`,
      transformResponse: (response: { data: { url: string } }) => response.data,
      providesTags: (_result, _error, certificateId) => [{ type: 'Certificate', id: certificateId }],
    }),
    verifyCertificate: builder.query<VerificationResult, string>({
      query: (certificateId) => `/certificates/verify/${certificateId}`,
      transformResponse: (response: { data: VerificationResult }) => response.data,
    }),
  }),
});

export const {
  useListMyCertificatesQuery,
  useGenerateCertificateMutation,
  useDownloadCertificateQuery,
  useVerifyCertificateQuery,
} = certificatesApi;
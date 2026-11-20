import { baseApi } from '../../app/api';
import type { EnrollmentWithCourse } from './types';

export const enrollmentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listMyEnrollments: builder.query<EnrollmentWithCourse[], void>({
      query: () => '/enrollments/mine',
      transformResponse: (response: { data: EnrollmentWithCourse[] }) => response.data,
      providesTags: ['Enrollment'],
    }),
    freeEnroll: builder.mutation<{ enrolled: boolean; progressPct: number }, string>({
      query: (courseId) => ({
        url: `/enrollments/free/${courseId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Enrollment', 'Course'],
    }),
  }),
});

export const { useListMyEnrollmentsQuery, useFreeEnrollMutation } = enrollmentApi;
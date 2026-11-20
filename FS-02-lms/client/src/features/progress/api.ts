import { baseApi } from '../../app/api';
import type { CourseProgress, LessonProgressInput, LessonProgress } from './types';

export const progressApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCourseProgress: builder.query<CourseProgress, string>({
      query: (courseId) => `/courses/${courseId}/progress`,
      providesTags: (_result, _error, courseId) => [{ type: 'Progress', id: courseId }],
    }),
    updateLessonProgress: builder.mutation<LessonProgress, { lessonId: string; data: LessonProgressInput }>({
      query: ({ lessonId, data }) => ({
        url: `/lessons/${lessonId}/progress`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Progress', 'Enrollment'],
    }),
    getCourseStudents: builder.query<
      Array<{ userId: string; name: string; email: string; progressPct: number; enrolledAt: string; completedAt?: string }>,
      string
    >({
      query: (courseId) => `/courses/${courseId}/students`,
      transformResponse: (response: { data: Array<{ userId: string; name: string; email: string; progressPct: number; enrolledAt: string; completedAt?: string }> }) => response.data,
      providesTags: ['Enrollment'],
    }),
  }),
});

export const { useGetCourseProgressQuery, useUpdateLessonProgressMutation, useGetCourseStudentsQuery } = progressApi;
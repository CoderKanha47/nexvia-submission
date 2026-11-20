import { baseApi } from '../../app/api';
import type { Course, CourseWithSections, Section, Lesson, SectionWithLessons } from './types';

export const coursesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listCourses: builder.query<
      { courses: Course[]; meta: { page: number; limit: number; total: number } },
      { q?: string; category?: string; level?: string; minPrice?: number; maxPrice?: number; sort?: 'newest' | 'popular' | 'price'; page?: number; limit?: number; includeComingSoon?: boolean }
    >({
      query: (params) => ({
        url: '/courses',
        params,
      }),
      transformResponse: (response: { data: Course[]; meta: { page: number; limit: number; total: number } }) => ({ courses: response.data, meta: response.meta }),
      providesTags: ['Course'],
    }),
    getCourse: builder.query<CourseWithSections, string>({
      query: (idOrSlug) => `/courses/${idOrSlug}`,
      transformResponse: (response: { data: CourseWithSections }) => response.data,
      providesTags: (_result, _error, idOrSlug) => [{ type: 'Course', id: idOrSlug }],
    }),
    getCourseCurriculum: builder.query<SectionWithLessons[], string>({
      query: (courseId) => `/courses/${courseId}/curriculum`,
      providesTags: (_result, _error, courseId) => [{ type: 'Course', id: courseId }],
    }),
    getMyCourses: builder.query<Course[], void>({
      query: () => '/courses/mine',
      transformResponse: (response: { data: Course[] }) => response.data,
      providesTags: ['Course'],
    }),
    createCourse: builder.mutation<Course, Partial<Course>>({
      query: (body) => ({
        url: '/courses',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Course'],
    }),
    updateCourse: builder.mutation<Course, { id: string; data: Partial<Course> }>({
      query: ({ id, data }) => ({
        url: `/courses/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Course', id }, 'Course'],
    }),
    deleteCourse: builder.mutation<void, string>({
      query: (id) => ({
        url: `/courses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Course'],
    }),
    submitForReview: builder.mutation<Course, string>({
      query: (id) => ({
        url: `/courses/${id}/submit`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Course', id }, 'Course'],
    }),
    publishCourse: builder.mutation<Course, string>({
      query: (id) => ({
        url: `/courses/${id}/publish`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Course', id }, 'Course'],
    }),
    unpublishCourse: builder.mutation<Course, string>({
      query: (id) => ({
        url: `/courses/${id}/unpublish`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Course', id }, 'Course'],
    }),
    // Sections
    createSection: builder.mutation<Section, { courseId: string; title: string; order?: number }>({
      query: ({ courseId, ...body }) => ({
        url: `/courses/${courseId}/sections`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Section', 'Course'],
    }),
    updateSection: builder.mutation<Section, { id: string; data: { title?: string; order?: number } }>({
      query: ({ id, data }) => ({
        url: `/sections/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Section'],
    }),
    deleteSection: builder.mutation<void, string>({
      query: (id) => ({
        url: `/sections/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Section'],
    }),
    // Lessons
    createLesson: builder.mutation<Lesson, { sectionId: string; data: Partial<Lesson> }>({
      query: ({ sectionId, data }) => ({
        url: `/courses/sections/${sectionId}/lessons`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Lesson', 'Section'],
    }),
    updateLesson: builder.mutation<Lesson, { id: string; data: Partial<Lesson> }>({
      query: ({ id, data }) => ({
        url: `/lessons/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Lesson'],
    }),
    deleteLesson: builder.mutation<void, string>({
      query: (id) => ({
        url: `/lessons/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Lesson'],
    }),
    // Reorder
    reorderCourse: builder.mutation<void, { id: string; sections: Array<{ id: string; order: number; lessons: Array<{ id: string; order: number }> }> }>({
      query: ({ id, ...body }) => ({
        url: `/courses/${id}/reorder`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Course', 'Section', 'Lesson'],
    }),
  }),
});

export const {
  useListCoursesQuery,
  useGetCourseQuery,
  useGetCourseCurriculumQuery,
  useGetMyCoursesQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useSubmitForReviewMutation,
  usePublishCourseMutation,
  useUnpublishCourseMutation,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
  useCreateLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
  useReorderCourseMutation,
} = coursesApi;
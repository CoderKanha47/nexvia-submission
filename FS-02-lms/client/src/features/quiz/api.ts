import { baseApi } from '../../app/api';
import type { Quiz, QuizAttempt, GradedResult } from './types';

export const quizApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createQuiz: builder.mutation<Quiz, { courseId: string; data: Partial<Quiz> }>({
      query: ({ courseId, data }) => ({
        url: `/courses/${courseId}/quizzes`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Quiz'],
    }),
    getQuiz: builder.query<Quiz, string>({
      query: (id) => `/quizzes/${id}`,
      transformResponse: (response: { data: Quiz }) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Quiz', id }],
    }),
    updateQuiz: builder.mutation<Quiz, { id: string; data: Partial<Quiz> }>({
      query: ({ id, data }) => ({
        url: `/quizzes/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Quiz', id }, 'Quiz'],
    }),
    deleteQuiz: builder.mutation<void, string>({
      query: (id) => ({
        url: `/quizzes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Quiz'],
    }),
    submitQuizAttempt: builder.mutation<{ attempt: QuizAttempt; graded: GradedResult }, { quizId: string; answers: Array<{ questionId: string; selectedOptionIds: string[] }> }>({
      query: ({ quizId, answers }) => ({
        url: `/quizzes/${quizId}/attempts`,
        method: 'POST',
        body: { answers },
      }),
      invalidatesTags: ['QuizAttempt', 'Progress'],
    }),
    getMyAttempts: builder.query<QuizAttempt[], string>({
      query: (quizId) => `/quizzes/${quizId}/attempts/mine`,
      transformResponse: (response: { data: QuizAttempt[] }) => response.data,
      providesTags: ['QuizAttempt'],
    }),
  }),
});

export const {
  useCreateQuizMutation,
  useGetQuizQuery,
  useUpdateQuizMutation,
  useDeleteQuizMutation,
  useSubmitQuizAttemptMutation,
  useGetMyAttemptsQuery,
} = quizApi;
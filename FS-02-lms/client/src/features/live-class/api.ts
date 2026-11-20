import { baseApi } from '../../app/api';
import type { LiveClass, LiveClassToken, ChatMessage } from './types';

export const liveClassApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createLiveClass: builder.mutation<LiveClass, { title: string; description?: string; scheduledAt?: string; durationMin: number; roomName?: string }>({
      query: (body) => ({
        url: '/live-classes',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['LiveClass'],
    }),
    listMyLiveClasses: builder.query<LiveClass[], void>({
      query: () => '/live-classes/mine',
      transformResponse: (response: { data: LiveClass[] }) => response.data,
      providesTags: ['LiveClass'],
    }),
    getLiveClass: builder.query<LiveClass, string>({
      query: (id) => `/live-classes/${id}`,
      transformResponse: (response: { data: LiveClass }) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'LiveClass', id }],
    }),
    listUpcomingForCourse: builder.query<LiveClass[], string>({
      query: (courseId) => `/live-classes/courses/${courseId}/upcoming`,
      transformResponse: (response: { data: LiveClass[] }) => response.data,
      providesTags: ['LiveClass'],
    }),
    listUpcomingLiveClasses: builder.query<LiveClass[], void>({
      query: () => '/live-classes/upcoming',
      transformResponse: (response: { data: LiveClass[] }) => response.data,
      providesTags: ['LiveClass'],
    }),
    updateLiveClass: builder.mutation<LiveClass, { id: string; data: Partial<LiveClass> }>({
      query: ({ id, data }) => ({
        url: `/live-classes/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'LiveClass', id }, 'LiveClass'],
    }),
    startLiveClass: builder.mutation<LiveClass, string>({
      query: (id) => ({
        url: `/live-classes/${id}/start`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'LiveClass', id }, 'LiveClass'],
    }),
    endLiveClass: builder.mutation<LiveClass, string>({
      query: (id) => ({
        url: `/live-classes/${id}/end`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'LiveClass', id }, 'LiveClass'],
    }),
    getLiveKitToken: builder.query<LiveClassToken, string>({
      query: (id) => `/live-classes/${id}/token`,
      transformResponse: (response: { data: LiveClassToken }) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'LiveClass', id }],
    }),
    addChatMessage: builder.mutation<ChatMessage, { liveClassId: string; message: string }>({
      query: ({ liveClassId, message }) => ({
        url: `/live-classes/${liveClassId}/chat`,
        method: 'POST',
        body: { message },
      }),
      invalidatesTags: ['LiveClass'],
    }),
    getChatHistory: builder.query<ChatMessage[], string>({
      query: (id) => `/live-classes/${id}/chat/history`,
      transformResponse: (response: { data: ChatMessage[] }) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'LiveClass', id }],
    }),
  }),
});

export const {
  useCreateLiveClassMutation,
  useListMyLiveClassesQuery,
  useGetLiveClassQuery,
  useListUpcomingForCourseQuery,
  useListUpcomingLiveClassesQuery,
  useUpdateLiveClassMutation,
  useStartLiveClassMutation,
  useEndLiveClassMutation,
  useGetLiveKitTokenQuery,
  useAddChatMessageMutation,
  useGetChatHistoryQuery,
} = liveClassApi;
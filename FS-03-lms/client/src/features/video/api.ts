import { baseApi } from '../../app/api';
import type { VideoAsset, PlaybackInfo } from './types';

export const videoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUploadUrl: builder.mutation<
      { assetId: string; uploadUrl: string; filename: string; contentType: string },
      { courseId: string; filename: string; contentType: string }
    >({
      query: (body) => ({
        url: '/videos/upload-url',
        method: 'POST',
        body,
      }),
    }),
    completeUpload: builder.mutation<VideoAsset, string>({
      query: (id) => ({
        url: `/videos/${id}/complete`,
        method: 'POST',
      }),
      invalidatesTags: ['Video'],
    }),
    getVideoAsset: builder.query<VideoAsset, string>({
      query: (id) => `/videos/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Video', id }],
    }),
    getPlayback: builder.query<PlaybackInfo, string>({
      query: (lessonId) => `/lessons/${lessonId}/playback`,
      providesTags: (_result, _error, lessonId) => [{ type: 'Video', id: lessonId }],
    }),
    localUpload: builder.mutation<VideoAsset, { assetId: string; file: File }>({
      query: ({ assetId, file }) => {
        const formData = new FormData();
        formData.append('video', file);
        return {
          url: `/videos/local-upload/${assetId}`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Video'],
    }),
  }),
});

export const {
  useGetUploadUrlMutation,
  useCompleteUploadMutation,
  useGetVideoAssetQuery,
  useGetPlaybackQuery,
  useLocalUploadMutation,
} = videoApi;
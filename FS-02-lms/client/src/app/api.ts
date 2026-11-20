import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../app/store';
import { setCredentials, clearCredentials } from '../features/auth/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
  credentials: 'include',
});

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

const baseQueryWithReauth: BaseQueryFn<FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const errorData = result.error.data as { error?: { code?: string; message?: string } } | undefined;
    const isTokenExpired = errorData?.error?.code === 'TOKEN_EXPIRED' || errorData?.error?.message?.includes('expired') || errorData?.error?.message?.includes('Invalid or expired access token');

    if (isTokenExpired) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = (async () => {
          try {
            const refreshResult = await baseQuery(
              { url: '/auth/refresh', method: 'POST', body: {} },
              api,
              extraOptions
            );
            if (refreshResult.data) {
              const data = refreshResult.data as { data: { accessToken: string } };
              const newAccessToken = data.data.accessToken;
              api.dispatch(setCredentials({ user: (api.getState() as RootState).auth.user!, accessToken: newAccessToken }));
              return newAccessToken;
            }
            return null;
          } catch {
            return null;
          } finally {
            isRefreshing = false;
          }
        })();
      }

      const newToken = await refreshPromise;
      if (newToken) {
        // Retry the original request with the new token
        const retryArgs = typeof args === 'string' ? args : { ...args, headers: { ...args.headers, Authorization: `Bearer ${newToken}` } };
        result = await baseQuery(retryArgs, api, extraOptions);
      } else {
        // Refresh failed, clear auth and redirect to login
        api.dispatch(clearCredentials());
        if (typeof window !== 'undefined') {
          window.location.href = '/login?reason=session_expired';
        }
      }
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Users',
    'Course',
    'Section',
    'Lesson',
    'Enrollment',
    'Progress',
    'Quiz',
    'QuizAttempt',
    'LiveClass',
    'Certificate',
    'Order',
    'Earnings',
    'Payout',
    'Video',
    'AdminStats',
    'Payment',
    'AdminPayment',
    'AdminActivity',
  ],
  endpoints: () => ({}),
});
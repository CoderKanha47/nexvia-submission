import { baseApi } from '../../app/api';
import type { User } from '../../features/auth/authSlice';

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<UsersResponse, { page?: number; limit?: number; role?: string; q?: string }>({
      query: ({ page = 1, limit = 20, role, q }) => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (role) params.append('role', role);
        if (q) params.append('q', q);
        return `/users?${params.toString()}`;
      },
      transformResponse: (response: { data: UsersResponse }) => response.data,
      providesTags: ['Users'],
    }),
  }),
});

export const { useGetUsersQuery } = usersApi;
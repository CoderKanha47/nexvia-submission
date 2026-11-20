import { baseApi } from '../../app/api';
import type { 
  CheckoutResult, 
  Order, 
  EarningsSummary, 
  EarningsByCourse, 
  EarningsMonthly, 
  Transaction, 
  PayoutRequest, 
  AdminStats,
  PayNextPayResult,
  Payment,
  AdminPayment,
  AdminActivity
} from './types';

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    checkout: builder.query<CheckoutResult, string>({
      query: (courseId) => `/payments/courses/${courseId}/checkout`,
      providesTags: ['Order'],
    }),
    myOrders: builder.query<Order[], void>({
      query: () => '/payments/orders',
      transformResponse: (response: { data: Order[] }) => response.data,
      providesTags: ['Order'],
    }),
    earningsSummary: builder.query<EarningsSummary, void>({
      query: () => '/payments/earnings/summary',
      transformResponse: (response: { data: EarningsSummary }) => response.data,
      providesTags: ['Earnings'],
    }),
    earningsByCourse: builder.query<EarningsByCourse[], void>({
      query: () => '/payments/earnings/by-course',
      transformResponse: (response: { data: EarningsByCourse[] }) => response.data,
      providesTags: ['Earnings'],
    }),
    earningsMonthly: builder.query<EarningsMonthly[], { months?: number }>({
      query: ({ months = 12 }) => `/payments/earnings/monthly?months=${months}`,
      transformResponse: (response: { data: EarningsMonthly[] }) => response.data,
      providesTags: ['Earnings'],
    }),
    transactions: builder.query<{ transactions: Transaction[]; meta: { page: number; limit: number; total: number } }, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 }) => `/payments/earnings/transactions?page=${page}&limit=${limit}`,
      transformResponse: (response: { data: { transactions: Transaction[]; meta: { page: number; limit: number; total: number } } }) => response.data,
      providesTags: ['Earnings'],
    }),
    requestPayout: builder.mutation<void, PayoutRequest>({
      query: (body) => ({
        url: '/payments/earnings/request-payout',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Earnings', 'Payout'],
    }),
    adminStats: builder.query<AdminStats, void>({
      query: () => '/payments/admin/stats',
      transformResponse: (response: { data: AdminStats }) => response.data,
      providesTags: ['AdminStats'],
    }),
    // PayNext endpoints - simplified one-step payment
    payForCourse: builder.mutation<PayNextPayResult, string>({
      query: (courseId) => ({
        url: '/paynext/pay',
        method: 'POST',
        body: { courseId },
      }),
      transformResponse: (response: { data: PayNextPayResult }) => response.data,
      invalidatesTags: ['Order', 'Payment', 'Earnings', 'AdminStats', 'Enrollment', 'AdminPayment', 'InstructorPayment'],
    }),
    getMyPayments: builder.query<Payment[], void>({
      query: () => '/paynext/me',
      transformResponse: (response: { data: Payment[] }) => response.data,
      providesTags: ['Payment'],
    }),
    getAdminPayments: builder.query<{ payments: AdminPayment[]; meta: { page: number; limit: number; total: number } }, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 }) => `/admin/payments?page=${page}&limit=${limit}`,
      transformResponse: (response: { data: { payments: AdminPayment[]; meta: { page: number; limit: number; total: number } } }) => response.data,
      providesTags: ['AdminPayment'],
    }),
    getInstructorPayments: builder.query<Payment[], void>({
      query: () => '/paynext/instructor',
      transformResponse: (response: { data: Payment[] }) => response.data,
      providesTags: ['InstructorPayment'],
    }),
    // Admin endpoints
    getAdminActivity: builder.query<AdminActivity[], { limit?: number }>({
      query: ({ limit = 20 }) => `/admin/activity?limit=${limit}`,
      transformResponse: (response: { data: AdminActivity[] }) => response.data,
      providesTags: ['AdminActivity'],
    }),
  }),
});

export const {
  useCheckoutQuery,
  useMyOrdersQuery,
  useEarningsSummaryQuery,
  useEarningsByCourseQuery,
  useEarningsMonthlyQuery,
  useTransactionsQuery,
  useRequestPayoutMutation,
  useAdminStatsQuery,
  usePayForCourseMutation,
  useGetMyPaymentsQuery,
  useGetAdminPaymentsQuery,
  useGetInstructorPaymentsQuery,
  useGetAdminActivityQuery,
} = paymentsApi;
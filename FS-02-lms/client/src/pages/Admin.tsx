import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAdminStatsQuery } from '../features/payments/api';
import { useGetUsersQuery } from '../features/users/api';
import { useListCoursesQuery } from '../features/courses/api';
import { useGetAdminPaymentsQuery, useGetAdminActivityQuery } from '../features/payments/api';
import { getRoleLabel, getRoleColors } from '../lib/roles';
import type { UserRole } from '../lib/roles';
import { formatPrice } from '../lib/formatPrice';
import { Loader2, DollarSign, Users, BookOpen, TrendingUp, Bell, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'activity'>('overview');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentPage, setPaymentPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = useAdminStatsQuery();
  const { data: usersResponse, isLoading: usersLoading } = useGetUsersQuery({ page: 1, limit: 10 });
  const { data: coursesResponse, isLoading: coursesLoading } = useListCoursesQuery({ includeComingSoon: true });
  const { data: paymentsResponse, isLoading: paymentsLoading, refetch: refetchPayments } = useGetAdminPaymentsQuery({ page: paymentPage, limit: 20 });
  const { data: activityData, isLoading: activityLoading, refetch: refetchActivity } = useGetAdminActivityQuery({ limit: 20 });

  // Polling for payments: 5s interval, pauses when tab hidden, backoff on errors
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(true);

useEffect(() => {
    if (activeTab !== 'payments') return;

    const doPoll = () => refetchPayments();

    const handleVisibilityChange = () => {
      isPollingRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    pollRef.current = setInterval(() => {
      if (!isPollingRef.current) return;
      doPoll();
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab, refetchPayments]);

  // Activity polling (only on activity tab)
  useEffect(() => {
    if (activeTab !== 'activity') return;
    const interval = setInterval(() => refetchActivity(), 5000);
    return () => clearInterval(interval);
  }, [activeTab, refetchActivity]);

  // Reset page when search changes
  useEffect(() => {
    setPaymentPage(1);
  }, [paymentSearch]);

  if (statsLoading || usersLoading || coursesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const users = usersResponse?.users ?? [];
  const allCourses = coursesResponse?.courses ?? [];
  const payments = paymentsResponse?.payments ?? [];
  const activities = activityData ?? [];

  const pendingReviewCount = allCourses.filter(c => c.status === 'pending_review').length;

  // Stats cards: total revenue from SUCCEEDED only
  const totalRevenue = stats?.revenueCents ?? 0;
  const totalEnrollments = stats?.enrollments ?? 0;

  const filteredPayments = payments.filter(p =>
    paymentSearch === '' ||
    p.userName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.userEmail.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.courseTitle.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.instructorName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.transactionId.toLowerCase().includes(paymentSearch.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-500">Polling every 5s (pauses when tab hidden)</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.users ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Courses</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.courses ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue (SUCCEEDED)</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatPrice(totalRevenue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Enrollments</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalEnrollments}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-4" aria-label="Admin tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              activeTab === 'payments'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Payments
            <RefreshCw className="w-4 h-4 animate-spin ml-1" />
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Activity
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
                <Link to="/admin/users" className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  View All
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                      <th className="p-3">Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-gray-500">No users found</td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{user.name}</td>
                          <td className="p-3 text-gray-600">{user.email}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColors(user.role as UserRole).bg} ${getRoleColors(user.role as UserRole).text}`}>
                              {getRoleLabel(user.role as UserRole)}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {user.isActive ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Courses Pending Review</h2>
                <Link to="/admin/courses" className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  View All
                </Link>
              </div>
              <div className="divide-y divide-gray-200">
                {pendingReviewCount === 0 ? (
                  <div className="px-6 py-4 text-center text-gray-500">No pending courses</div>
                ) : (
                  allCourses.filter(c => c.status === 'pending_review').map((course) => (
                    <div key={course._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">{course.title}</p>
                        <p className="text-sm text-gray-500">Instructor: {course.instructorName || 'Unknown'} • Status: {course.status}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">Approve</button>
                        <button className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Reject</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Live</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search student, course, instructor, transaction..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
              />
              <button
                onClick={() => refetchPayments()}
                disabled={paymentsLoading}
                className="px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          {paymentsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                      <th className="p-3">Transaction ID</th>
                      <th className="p-3">Student</th>
                      <th className="p-3">Course</th>
                      <th className="p-3">Instructor</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Gateway</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-gray-500">No payments found</td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="p-3 font-mono text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{payment.transactionId.slice(0, 14)}…</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(payment.transactionId);
                                  toast.success('Copied transaction ID');
                                }}
                                className="text-gray-400 hover:text-indigo-600"
                                title="Copy transaction ID"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-gray-900">{payment.userName}</div>
                            <div className="text-sm text-gray-500">{payment.userEmail}</div>
                          </td>
                          <td className="p-3 text-gray-700">{payment.courseTitle}</td>
                          <td className="p-3 text-gray-700">{payment.instructorName}</td>
                          <td className="p-3 font-medium text-indigo-600">{formatPrice(payment.amountCents, payment.currency)}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              payment.status === 'SUCCEEDED' ? 'bg-green-100 text-green-700' :
                              payment.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="p-3 text-gray-600">{payment.gateway}</td>
                          <td className="p-3 text-sm text-gray-500">{new Date(payment.createdAt).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Page {paymentsResponse?.meta?.page ?? 1} of {Math.ceil((paymentsResponse?.meta?.total ?? 0) / 20)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentPage(p => Math.max(1, p - 1))}
                    disabled={paymentPage <= 1 || paymentsLoading}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPaymentPage(p => p + 1)}
                    disabled={paymentPage >= Math.ceil((paymentsResponse?.meta?.total ?? 0) / 20) || paymentsLoading}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Auto-refresh (5s)</span>
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            </div>
          </div>
          {activityLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activities.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">No activity yet</div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'payment.succeeded' ? 'bg-green-100 text-green-600' :
                      activity.type === 'enrollment.created' ? 'bg-blue-100 text-blue-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      {activity.type === 'payment.succeeded' && <DollarSign className="w-5 h-5" />}
                      {activity.type === 'enrollment.created' && <Users className="w-5 h-5" />}
                      {activity.type === 'course.published' && <BookOpen className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{activity.message}</p>
                      <p className="text-sm text-gray-500">{new Date(activity.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
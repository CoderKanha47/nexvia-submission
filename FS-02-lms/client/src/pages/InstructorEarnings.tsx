import { useState, useEffect } from 'react';
import {
  useEarningsSummaryQuery,
  useEarningsByCourseQuery,
  useEarningsMonthlyQuery,
  useRequestPayoutMutation,
  useGetInstructorPaymentsQuery,
} from '../features/payments/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatPrice, formatPriceCompact } from '../lib/formatPrice';
import { Loader2, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function InstructorEarnings() {
  const { data: summary, isLoading: summaryLoading } = useEarningsSummaryQuery();
  const { data: byCourse, isLoading: byCourseLoading } = useEarningsByCourseQuery();
  const { data: monthly, isLoading: monthlyLoading } = useEarningsMonthlyQuery({ months: 12 });
  const { data: instructorPayments, isLoading: paymentsLoading, refetch: refetchPayments } = useGetInstructorPaymentsQuery();
  const [requestPayout] = useRequestPayoutMutation();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState('');

  // Polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchPayments();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetchPayments]);

  const handleRequestPayout = async () => {
    const amount = Number(payoutAmount);
    if (!amount || amount < 100) {
      setPayoutError('Amount must be at least 100 cents (₹1)');
      return;
    }
    if (summary && amount > summary.availableCents) {
      setPayoutError(`Amount exceeds available balance (${formatPrice(summary.availableCents)})`);
      return;
    }
    setPayoutLoading(true);
    setPayoutError('');
    setPayoutSuccess('');
    try {
      await requestPayout({ amountCents: amount }).unwrap();
      setPayoutSuccess('Payout requested successfully!');
      setPayoutAmount('');
      toast.success('Payout requested successfully!');
    } catch (err: unknown) {
      const error = err as { data?: { error?: { message?: string } } };
      setPayoutError(error.data?.error?.message || 'Failed to request payout');
      toast.error(error.data?.error?.message || 'Failed to request payout');
    } finally {
      setPayoutLoading(false);
    }
  };

  const chartData = {
    labels: monthly?.map((m) => m.month) ?? [],
    datasets: [
      {
        label: 'Net Earnings (₹)',
        data: monthly?.map((m) => m.netCents / 100) ?? [],
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { 
        beginAtZero: true, 
        ticks: { 
          callback: (value: number | string) => formatPriceCompact(Number(value) * 100) 
        } 
      },
    },
  };

  if (summaryLoading || byCourseLoading || monthlyLoading || paymentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Earnings Dashboard</h1>
        <button
          onClick={() => refetchPayments()}
          disabled={paymentsLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${paymentsLoading ? 'animate-spin' : ''}`} />
          <span>Refresh (auto every 5s)</span>
        </button>
      </div>
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Gross Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatPrice(summary?.grossCents)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Platform Fees (20%)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatPrice(summary?.feeCents)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Net Earnings</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{formatPrice(summary?.netCents)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Available for Payout</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatPrice(summary?.availableCents)}</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Earnings (Last 12 Months)</h2>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Earnings by Course</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                  <th className="pb-2">Course</th>
                  <th className="pb-2 text-right">Sales</th>
                  <th className="pb-2 text-right">Net Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byCourse?.map((course) => (
                  <tr key={course.courseId} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{course.title}</td>
                    <td className="py-3 text-right text-gray-600">{course.sales}</td>
                    <td className="py-3 text-right font-medium text-indigo-600">{formatPrice(course.netCents)}</td>
                  </tr>
                ))}
                {(!byCourse || byCourse.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500">No earnings data yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Student Purchases</h2>
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live (polling every 5s)
          </span>
        </div>
        {paymentsLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {instructorPayments?.map((payment) => (
              <div key={payment.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{payment.user?.name || 'Unknown Student'}</p>
                    <p className="text-sm text-gray-500">{payment.user?.email || ''}</p>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{payment.course?.title || 'Unknown Course'}</p>
                  <p className="text-sm text-gray-500">{new Date(payment.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-indigo-600">{formatPrice(payment.amountCents)}</p>
                  <p className="text-sm text-gray-500">Transaction: {payment.transactionId}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  payment.status === 'SUCCEEDED' ? 'bg-green-100 text-green-700' :
                  payment.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {payment.status}
                </span>
              </div>
            ))}
            {(!instructorPayments || instructorPayments.length === 0) && (
              <div className="px-6 py-8 text-center text-gray-500">No student purchases yet</div>
            )}
          </div>
        )}
      </div>
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Payout</h2>
        <div className="max-w-md">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Available Balance</label>
            <p className="text-2xl font-bold text-green-600">{formatPrice(summary?.availableCents)}</p>
          </div>
          <div className="mb-4">
            <label htmlFor="payoutAmount" className="block text-sm font-medium text-gray-700 mb-1">Amount to Withdraw (cents)</label>
            <input
              id="payoutAmount"
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              min="100"
              max={summary?.availableCents ?? 1000000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {payoutError && <p className="text-red-600 text-sm mb-3">{payoutError}</p>}
          {payoutSuccess && <p className="text-green-600 text-sm mb-3">{payoutSuccess}</p>}
          <button
            onClick={handleRequestPayout}
            disabled={payoutLoading}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {payoutLoading ? 'Requesting...' : 'Request Payout'}
          </button>
        </div>
      </div>
    </div>
  );
}
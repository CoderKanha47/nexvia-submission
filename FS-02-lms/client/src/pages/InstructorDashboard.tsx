import { Link } from 'react-router-dom';
import { useGetMyCoursesQuery } from '../features/courses/api';
import { useEarningsSummaryQuery } from '../features/payments/api';
import { formatPrice } from '../lib/formatPrice';

export default function InstructorDashboard() {
  const { data: courses, isLoading: coursesLoading } = useGetMyCoursesQuery();
  const { data: earnings, isLoading: earningsLoading } = useEarningsSummaryQuery();

  if (coursesLoading || earningsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const totalCourses = courses?.length ?? 0;
  const totalStudents = courses?.reduce((sum, c) => sum + (c.totalLessons || 0), 0) ?? 0; // placeholder
  const totalRevenue = earnings?.grossCents ? formatPrice(earnings.grossCents) : 'Free';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Instructor Dashboard</h1>
        <Link
          to="/instructor/courses/new"
          className="px-4 py-2 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          Create New Course
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Total Courses</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalCourses}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Total Students</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalStudents.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">₹{totalRevenue}</p>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Courses</h2>
        </div>
        {courses && courses.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {courses.map((course) => (
              <div key={course._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <h3 className="font-medium text-gray-900">{course.title}</h3>
                  <p className="text-sm text-gray-500">
                    {course.status.charAt(0).toUpperCase() + course.status.slice(1)} • {course.totalLessons} lessons • 
                    {course.priceCents === 0 ? 'Free' : formatPrice(course.priceCents, course.currency)}
                  </p>
                </div>
                <Link
                  to={`/instructor/courses/${course._id}/edit`}
                  className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 mb-4">You haven't created any courses yet.</p>
            <Link
              to="/instructor/courses/new"
              className="px-4 py-2 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700"
            >
              Create Your First Course
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
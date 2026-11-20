import { Link } from 'react-router-dom';
import { useListMyEnrollmentsQuery } from '../features/enrollment/api';

export default function MyLearning() {
  const { data: enrollments, isLoading, error } = useListMyEnrollmentsQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load your courses</p>
      </div>
    );
  }

  const courses = enrollments ?? [];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Learning</h1>
      {courses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">You haven't enrolled in any courses yet.</p>
          <Link to="/courses" className="text-indigo-600 hover:underline font-medium">
            Browse Courses →
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((enrollment) => {
            const course = enrollment.course;
            return course ? (
              <div key={enrollment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="aspect-video bg-gray-100 relative">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-2xl">▶</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {enrollment.progressPct}% complete
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{course.title}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                    <span>{enrollment.completedLessons ?? 0}/{course.totalLessons ?? 0} lessons</span>
                    <span>{enrollment.progressPct}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${enrollment.progressPct}%` }} />
                  </div>
                  <Link
                    to={`/learn/${course._id}`}
                    className="block text-center py-2 px-4 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    {enrollment.completedAt ? 'Review Course' : 'Continue Learning'}
                  </Link>
                </div>
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
import { Link } from 'react-router-dom';
import { useListCoursesQuery } from '../features/courses/api';
import { useAppSelector } from '../app/hooks';

export default function InstructorCourses() {
  const { user } = useAppSelector((state) => state.auth);
  const { data: coursesResponse, isLoading, error } = useListCoursesQuery({ includeComingSoon: true });

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
        <p className="text-red-600">Failed to load courses</p>
      </div>
    );
  }

  const instructorCourses = coursesResponse?.courses?.filter(c => c.instructorId === user?.id) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
        <Link to="/instructor/courses/new" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Create New Course
        </Link>
      </div>

      {instructorCourses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">You haven't created any courses yet.</p>
          <Link to="/instructor/courses/new" className="text-indigo-600 hover:underline font-medium">
            Create Your First Course →
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {instructorCourses.map((course) => (
            <div key={course._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="aspect-video bg-gray-100 relative">
                {course.thumbnailUrl ? (
                  <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-2xl">▶</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    course.status === 'published' ? 'bg-green-100 text-green-700' :
                    course.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {course.status}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{course.title}</h3>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span>{course.totalLessons ?? 0} lessons</span>
                  <span>{course.category}</span>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/instructor/courses/${course._id}/edit`}
                    className="flex-1 text-center py-2 px-4 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    Edit
                  </Link>
                  {course.status === 'published' && (
                    <Link
                      to={`/courses/${course.slug}`}
                      className="flex-1 text-center py-2 px-4 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
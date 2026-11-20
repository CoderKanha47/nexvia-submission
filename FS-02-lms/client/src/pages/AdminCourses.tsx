import { useListCoursesQuery } from '../features/courses/api';

export default function AdminCourses() {
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

  const allCourses = coursesResponse?.courses ?? [];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Course Management</h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                <th className="p-3">Title</th>
                <th className="p-3">Instructor</th>
                <th className="p-3">Status</th>
                <th className="p-3">Category</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-gray-500">No courses found</td>
                </tr>
              ) : (
                allCourses.map((course) => (
                  <tr key={course._id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{course.title}</td>
                    <td className="p-3 text-gray-600">{course.instructorName || 'Unknown'}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        course.status === 'published' ? 'bg-green-100 text-green-700' :
                        course.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                        course.status === 'unpublished' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {course.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600">{course.category}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {course.status === 'pending_review' && (
                          <>
                            <button className="px-2 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">Approve</button>
                            <button className="px-2 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Reject</button>
                          </>
                        )}
                        {course.status === 'published' && (
                          <button className="px-2 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Unpublish</button>
                        )}
                        {course.status === 'unpublished' && (
                          <button className="px-2 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Publish</button>
                        )}
                        {course.status === 'draft' && (
                          <span className="px-2 py-1 text-sm text-gray-500">Draft</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
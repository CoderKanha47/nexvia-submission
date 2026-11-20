import { Link } from 'react-router-dom';
import { useListCoursesQuery } from '../../features/courses/api';
import CourseCard from './CourseCard';

export default function FeaturedCourses() {
  const { data, isLoading, error } = useListCoursesQuery({ limit: 8, sort: 'newest' });

  if (isLoading) {
    return (
      <section className="py-16 lg:py-24 bg-gray-50" aria-labelledby="featured-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <h2 id="featured-heading" className="text-2xl sm:text-3xl font-bold text-gray-900">Featured Courses</h2>
            <Link to="/courses" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-gray-200 rounded-xl mb-4" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-8 bg-gray-200 rounded w-24" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !data?.courses?.length) {
    return (
      <section className="py-16 lg:py-24 bg-gray-50" aria-labelledby="featured-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-16">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses available</h3>
          <p className="text-gray-500 mb-6">Check back soon for new courses.</p>
          <Link to="/courses" className="px-6 py-3 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 inline-flex">
            Browse All Courses
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 lg:py-24 bg-gray-50" aria-labelledby="featured-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 id="featured-heading" className="text-2xl sm:text-3xl font-bold text-gray-900">Featured Courses</h2>
            <p className="text-gray-500 mt-1">Hand-picked courses to jumpstart your learning journey</p>
          </div>
          <Link to="/courses" className="hidden md:inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
            View all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.courses.map((course, index) => (
            <div key={course._id} style={{ animationDelay: `${index * 100}ms` }}>
              <CourseCard key={course._id} course={course} />
            </div>
          ))}
        </div>
        <div className="mt-10 text-center md:hidden">
          <Link to="/courses" className="inline-flex items-center gap-1 px-6 py-3 rounded-lg font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
            View all courses
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGetCourseQuery, useGetCourseCurriculumQuery } from '../features/courses/api';
import { useAuth } from '../features/auth';
import { useAppSelector } from '../app/hooks';
import { Price } from '../lib/formatPrice';
import { PayNextModal } from '../components/paynext';
import { useState, useCallback } from 'react';

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { user } = useAppSelector((state) => state.auth);

  const { data: course, isLoading, error } = useGetCourseQuery(slug ?? '', { skip: !slug });

  const isPublished = course?.status === 'published';
  const isComingSoon = course?.comingSoon === true;
  const isOwner = user && course?.instructorId === user.id;
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const { data: curriculum, isLoading: curriculumLoading } = useGetCourseCurriculumQuery(course?._id ?? '', {
    skip: !course || !isPublished,
  });

  const [showPayNext, setShowPayNext] = useState(false);

  const handleEnroll = useCallback(async () => {
    if (!accessToken) {
      navigate('/login', { state: { from: `/courses/${slug}` } });
      return;
    }
    if (!course) return;
    
    if (course.priceCents === 0) {
      // Free course - enroll directly
      try {
        const response = await fetch(`/api/v1/enrollments/courses/${course._id}/enroll-free`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        const data = await response.json();
        if (response.ok) {
          navigate(`/learn/${course._id}`);
        } else {
          alert(data.error?.message || 'Failed to enroll');
        }
      } catch {
        alert('Failed to enroll');
      }
      return;
    }
    
    setShowPayNext(true);
  }, [accessToken, course, navigate, slug]);

  const handlePayNextSuccess = useCallback((_transactionId: string) => {
    if (course) {
      navigate(`/learn/${course._id}`);
    }
  }, [course, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Course not found</p>
        <Link to="/courses" className="text-indigo-600 hover:underline mt-4 inline-block">
          ← Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link to="/courses" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Courses
        </Link>
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {course.thumbnailUrl ? (
            <img src={course.thumbnailUrl} alt={course.title} className="aspect-video w-full object-cover rounded-lg mb-6" />
          ) : (
            <div className="aspect-video bg-gray-100 rounded-lg mb-6 flex items-center justify-center">
              <span className="text-gray-400">No thumbnail</span>
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{course.title}</h1>
          <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">{course.category}</span>
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full capitalize">{course.level}</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">{course.totalLessons} lessons</span>
          </div>
          <p className="text-gray-600 mb-6 whitespace-pre-wrap">{course.description}</p>

          {isPublished && (
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Curriculum</h2>
              <div className="space-y-2">
                {curriculumLoading ? (
                  <p className="text-gray-500 text-center py-4">Loading curriculum...</p>
                ) : curriculum && curriculum.length > 0 ? (
                  curriculum.map((section) => (
                    <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{section.title}</h3>
                        <span className="text-sm text-gray-500">{section.lessons?.length ?? 0} lessons</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {section.lessons?.map((lesson) => (
                          <div key={lesson.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center space-x-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                lesson.type === 'video' ? 'bg-indigo-100 text-indigo-700' :
                                lesson.type === 'quiz' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {lesson.type === 'video' ? '▶' : lesson.type === 'quiz' ? '?' : '📄'}
                              </span>
                              <span className="text-gray-700">{lesson.title}</span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {Math.floor((lesson.durationSec || 0) / 60)} min
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No curriculum available yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
            <div className="text-3xl font-bold text-indigo-600 mb-4">
              <Price amount={course.priceCents} currency={course.currency} />
            </div>
            {!isPublished ? (
              <div className="text-center py-4">
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                  {course.status === 'draft' ? 'Draft' : 'Pending Review'}
                </span>
              </div>
            ) : isComingSoon ? (
              <div className="text-center py-4">
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                  Coming Soon
                </span>
                <p className="text-sm text-gray-500 mt-2">This course is coming soon. Check back later!</p>
              </div>
            ) : (
              <>
                {isOwner && (
                  <Link
                    to={`/instructor/courses/${course._id}/edit`}
                    className="w-full py-3 px-4 rounded-md bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors mb-4 block text-center"
                  >
                    Manage Course
                  </Link>
                )}
                {isAdmin && !isOwner && (
                  <Link
                    to={`/instructor/courses/${course._id}/edit`}
                    className="w-full py-3 px-4 rounded-md bg-amber-100 text-amber-700 font-medium hover:bg-amber-200 transition-colors mb-4 block text-center"
                  >
                    Edit (Admin)
                  </Link>
                )}
                {(isStudent || !accessToken) && !isComingSoon && (
                  <button
                    onClick={handleEnroll}
                    className="w-full py-3 px-4 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors mb-4"
                  >
                    {course.priceCents === 0 ? 'Enroll for Free' : 'Enroll Now'}
                  </button>
                )}
              </>
            )}
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Duration</span>
                <span className="font-medium">
                  {Math.floor(course.totalDurationSec / 3600)}h {Math.floor((course.totalDurationSec % 3600) / 60)}m
                </span>
              </div>
              <div className="flex justify-between">
                <span>Lessons</span>
                <span className="font-medium">{course.totalLessons}</span>
              </div>
              <div className="flex justify-between">
                <span>Level</span>
                <span className="font-medium capitalize">{course.level}</span>
              </div>
              <div className="flex justify-between">
                <span>Language</span>
                <span className="font-medium">English</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <PayNextModal
        isOpen={showPayNext}
        onClose={() => { setShowPayNext(false); }}
        onSuccess={handlePayNextSuccess}
        course={{
          id: course._id,
          title: course.title,
          thumbnailUrl: course.thumbnailUrl,
          priceCents: course.priceCents,
          currency: course.currency,
        }}
      />
    </div>
  );
}
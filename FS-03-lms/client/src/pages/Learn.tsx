import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useGetCourseQuery } from '../features/courses/api';
import { useGetCourseProgressQuery, useUpdateLessonProgressMutation } from '../features/progress/api';
import { useGetPlaybackQuery } from '../features/video/api';
import { useAuth } from '../features/auth';

export default function Learn() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentLesson, setCurrentLesson] = useState<{ id: string; title: string; type: string; videoAssetId?: string; quizId?: string } | null>(null);

  const { data: course, isLoading: courseLoading } = useGetCourseQuery(courseId ?? '', { skip: !courseId });
  const { data: progress, isLoading: progressLoading } = useGetCourseProgressQuery(courseId ?? '', { skip: !courseId });
  const [updateLessonProgress] = useUpdateLessonProgressMutation();

  // Get the first incomplete lesson or the first lesson as default
  const firstLesson = course?.sections?.[0]?.lessons?.[0];
  const lessonId = currentLesson?.id ?? firstLesson?.id;

  const { data: playbackData, isLoading: playbackLoading } = useGetPlaybackQuery(lessonId ?? '', {
    skip: !lessonId || currentLesson?.type !== 'video',
  });

  useEffect(() => {
    if (!accessToken) {
      navigate('/login', { state: { from: `/learn/${courseId}` } });
      return;
    }
  }, [accessToken, courseId, navigate]);

  useEffect(() => {
    if (videoRef.current && playbackData?.manifestUrl) {
      const video = videoRef.current;
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(playbackData.manifestUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        return () => hls.destroy();
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = playbackData.manifestUrl;
        video.addEventListener('loadedmetadata', () => video.play().catch(() => {}));
      }
    }
  }, [playbackData?.manifestUrl]);

  const handleVideoProgress = () => {
    if (videoRef.current && currentLesson) {
      updateLessonProgress({
        lessonId: currentLesson.id,
        data: { positionSec: Math.floor(videoRef.current.currentTime) },
      });
    }
  };

  const handleMarkComplete = () => {
    if (currentLesson) {
      updateLessonProgress({
        lessonId: currentLesson.id,
        data: { completed: true },
      });
    }
  };

  const handleLessonClick = (lesson: { id: string; title: string; type: string; videoAssetId?: string }) => {
    setCurrentLesson(lesson);
  };

  if (courseLoading || progressLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Course not found</p>
      </div>
    );
  }

  // Flatten all lessons for navigation
  const allLessons = course.sections?.flatMap((section) =>
    section.lessons?.map((lesson) => ({ ...lesson, sectionTitle: section.title })) ?? []
  ) ?? [];

  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson?.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const lessonProgress = progress?.lessons?.find((l) => l.lessonId === currentLesson?.id);

  return (
    <div className="grid gap-8 lg:grid-cols-4">
      <div className="lg:col-span-3">
        {currentLesson?.type === 'video' && playbackData?.manifestUrl ? (
          <>
            <video
              ref={videoRef}
              className="aspect-video bg-black rounded-lg mb-4"
              controls
              onTimeUpdate={handleVideoProgress}
            />
            {playbackLoading && <div className="text-center text-gray-400">Loading video...</div>}
          </>
        ) : currentLesson?.type === 'quiz' ? (
          <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
            <a href={`/quiz/${currentLesson.quizId}`} className="text-indigo-600 hover:underline">
              Take Quiz: {currentLesson.title}
            </a>
          </div>
        ) : currentLesson?.type === 'text' ? (
          <div className="aspect-video bg-white rounded-lg border border-gray-200 p-6 mb-4">
            <p className="text-gray-600">Text content for {currentLesson.title}</p>
          </div>
        ) : (
          <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
            <span className="text-gray-400">Select a lesson to start</span>
          </div>
        )}

        {currentLesson && (
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentLesson.title}</h1>
            <p className="text-gray-600 mb-6">
              {currentLesson.type === 'video'
                ? `Video lesson - ${lessonProgress?.completed ? 'Completed' : `${Math.round((lessonProgress?.lastPositionSec ?? 0) / 60)} min watched`}`
                : currentLesson.type === 'quiz'
                ? 'Quiz lesson - Test your knowledge'
                : 'Text lesson - Read and learn'}
            </p>
            <div className="flex items-center justify-between">
              <button
                onClick={() => prevLesson && handleLessonClick(prevLesson)}
                disabled={!prevLesson}
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={handleMarkComplete}
                disabled={lessonProgress?.completed}
                className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:opacity-50"
              >
                {lessonProgress?.completed ? 'Completed ✓' : 'Mark Complete'}
              </button>
              <button
                onClick={() => nextLesson && handleLessonClick(nextLesson)}
                disabled={!nextLesson}
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Course Content</h2>
            <span className="text-sm text-gray-500">
              {progress?.progressPct ?? 0}% complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress?.progressPct ?? 0}%` }}
            />
          </div>
          <nav className="space-y-3">
            {course.sections?.map((section, sectionIndex) => (
              <div key={section.id || sectionIndex}>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  {section.title}
                  <span className="ml-2 text-xs text-gray-400">
                    ({section.lessons?.length ?? 0} lessons)
                  </span>
                </h3>
                <ul className="space-y-1 pl-4 border-l-2 border-gray-200">
                  {section.lessons?.map((lesson, lessonIndex) => {
                    const lp = progress?.lessons?.find((l) => l.lessonId === lesson.id);
                    const isCurrent = lesson.id === currentLesson?.id;
                    const isComplete = lp?.completed ?? false;
                    return (
                      <li key={lesson.id || lessonIndex}>
                        <button
                          onClick={() => handleLessonClick(lesson)}
                          className={`w-full text-left flex items-center space-x-2 py-1.5 px-2 rounded transition-colors ${
                            isCurrent
                              ? 'bg-indigo-50 text-indigo-700'
                              : isComplete
                              ? 'text-green-700'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isComplete
                              ? 'border-green-500 text-green-500'
                              : isCurrent
                              ? 'border-indigo-500'
                              : 'border-gray-300'
                          }`}>
                            {isComplete && <span className="text-xs">✓</span>}
                          </span>
                          <span className="text-sm truncate">{lesson.title}</span>
                          {lesson.type === 'video' && <span className="text-xs text-gray-400 ml-auto">▶</span>}
                          {lesson.type === 'quiz' && <span className="text-xs text-gray-400 ml-auto">?</span>}
                          {lesson.type === 'text' && <span className="text-xs text-gray-400 ml-auto">📄</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
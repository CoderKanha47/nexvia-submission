import { Link } from 'react-router-dom';
import { Price } from '../../lib/formatPrice';

const levelColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

const gradientColors = [
  'from-indigo-500 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-purple-500 to-indigo-600',
];

function getGradientForTitle(title: string): string {
  const seed = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `bg-gradient-to-br ${gradientColors[seed % gradientColors.length]}`;
}

function getInitialsFromTitle(title: string): string {
  return title
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function StarRating({ rating = 4.5, count = 0 }: { rating?: number; count?: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      <div className="flex gap-0.25">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${
              i < fullStars
                ? 'text-yellow-400 fill-current'
                : i === fullStars && hasHalfStar
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.74l5.81-5.1L2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      {count > 0 && <span className="text-xs text-gray-500 ml-1">({count})</span>}
    </div>
  );
}

function Thumbnail({ course }: { course: { thumbnailUrl?: string; title: string } }) {
  if (course.thumbnailUrl) {
    return (
      <>
        <img
          src={course.thumbnailUrl}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
            if (placeholder) placeholder.classList.remove('hidden');
          }}
        />
        <div
          className={`absolute inset-0 w-full h-full ${getGradientForTitle(course.title)} flex items-center justify-center hidden`}
          aria-hidden="true"
        >
          <span className="text-3xl font-bold text-white/80">{getInitialsFromTitle(course.title)}</span>
        </div>
      </>
    );
  }
  return (
    <div className={`w-full h-full ${getGradientForTitle(course.title)} flex items-center justify-center`} aria-hidden="true">
      <span className="text-3xl font-bold text-white/80">{getInitialsFromTitle(course.title)}</span>
    </div>
  );
}

function CourseFooter({ course }: { course: { priceCents: number; currency: string; slug: string; comingSoon?: boolean } }) {
  if (course.comingSoon) {
    return (
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
        <div className="flex items-center gap-2">
          <Price amount={course.priceCents} currency={course.currency} />
        </div>
        <button
          disabled
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed"
        >
          Coming Soon
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
      <div className="flex items-center gap-2">
        <Price amount={course.priceCents} currency={course.currency} />
      </div>
      <Link
        to={`/courses/${course.slug}`}
        className="px-4 py-2 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        {course.priceCents === 0 ? 'Enroll Free' : 'View Details'}
      </Link>
    </div>
  );
}

interface CourseCardProps {
  course: {
    _id: string;
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    level: string;
    priceCents: number;
    currency: string;
    thumbnailUrl?: string;
    totalLessons: number;
    totalDurationSec: number;
    instructorName?: string;
    comingSoon?: boolean;
  };
}

export default function CourseCard({ course }: CourseCardProps) {
  const levelLabel = course.level.charAt(0).toUpperCase() + course.level.slice(1);

  return (
    <article
      className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 hover:-translate-y-1 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = `/courses/${course.slug}`;
        }
      }}
    >
      <Link
        to={`/courses/${course.slug}`}
        className="block relative aspect-video overflow-hidden rounded-t-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        aria-label={`View course: ${course.title}`}
      >
        <Thumbnail course={course} />
        {course.comingSoon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <span className="px-4 py-2 text-lg font-bold text-white bg-indigo-600/90 rounded-xl shadow-lg">
              Coming Soon
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${levelColors[course.level] || 'bg-gray-100 text-gray-700'}`}>
            {levelLabel}
          </span>
          {course.priceCents === 0 && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500 text-white">Free</span>
          )}
        </div>
        <div className="absolute top-3 right-3 flex gap-1.5">
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-white/90 backdrop-blur-sm text-gray-700 flex items-center gap-1">
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 119.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a3 3 0 106 0v-7z" /></svg>
            {Math.floor(course.totalDurationSec / 60)} min
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex items-center gap-2">
            {course.instructorName && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs text-gray-700">
                <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {course.instructorName}
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs text-gray-700 ml-auto">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 119.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a3 3 0 106 0v-7z" /></svg>
              {Math.floor(course.totalDurationSec / 60)} min
            </div>
          </div>
        </div>
      </Link>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{course.category}</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{course.totalLessons} lessons</span>
        </div>
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors min-h-[2.5rem]">{course.title}</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">{course.description}</p>
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${levelColors[course.level] || 'bg-gray-100 text-gray-700'}`}>
            {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
          </span>
          {course.instructorName && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              {course.instructorName}
            </span>
          )}
        </div>
        <StarRating rating={4.5} count={120} />
        <CourseFooter course={course} />
      </div>
    </article>
  );
}
import { useState, useMemo } from 'react';
import { useListCoursesQuery } from '../features/courses/api';
import { useSearchParams } from 'react-router-dom';
import CourseCard from '../components/home/CourseCard';
import { EmptyState, Pagination } from '../components/home';

type SortValue = 'popular' | 'newest' | 'price';
type LevelValue = 'all' | 'beginner' | 'intermediate' | 'advanced';
type PriceValue = 'all' | 'free' | 'paid';

export default function Courses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLevel, setSelectedLevel] = useState<LevelValue>(searchParams.get('level') as LevelValue || 'all');
  const [selectedPrice, setSelectedPrice] = useState<PriceValue>(searchParams.get('price') as PriceValue || 'all');
  const [selectedSort, setSelectedSort] = useState<SortValue>(searchParams.get('sort') as SortValue || 'popular');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  const apiParams = useMemo(() => ({
    q: searchQuery || undefined,
    level: selectedLevel !== 'all' ? selectedLevel : undefined,
    minPrice: selectedPrice === 'paid' ? 1 : undefined,
    maxPrice: selectedPrice === 'free' ? 0 : undefined,
    sort: selectedSort,
    page: currentPage,
    limit: 12,
    includeComingSoon: true,
  }), [searchQuery, selectedLevel, selectedPrice, selectedSort, currentPage]);

  const { data, isLoading, error } = useListCoursesQuery(apiParams);

  const courses = data?.courses ?? [];
  const totalCourses = data?.meta?.total ?? 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (searchQuery) next.set('q', searchQuery);
      else next.delete('q');
      next.set('page', '1');
      return next;
    });
    setCurrentPage(1);
  };

  const handleLevelChange = (level: LevelValue) => {
    setSelectedLevel(level);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (level === 'all') next.delete('level');
      else next.set('level', level);
      next.set('page', '1');
      return next;
    });
    setCurrentPage(1);
  };

  const handlePriceChange = (price: PriceValue) => {
    setSelectedPrice(price);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (price === 'all') next.delete('price');
      else next.set('price', price);
      next.set('page', '1');
      return next;
    });
    setCurrentPage(1);
  };

  const handleSortChange = (sort: SortValue) => {
    setSelectedSort(sort);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (sort === 'popular') next.delete('sort');
      else next.set('sort', sort);
      next.set('page', '1');
      return next;
    });
    setCurrentPage(1);
  };
  const hasActiveFilters = selectedLevel !== 'all' || selectedPrice !== 'all' || selectedSort !== 'popular' || !!searchQuery;

  if (isLoading) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
            <p className="text-gray-500 mt-1">Discover courses to advance your skills</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse flex flex-col h-full">
              <div className="aspect-video bg-gray-200" />
              <div className="p-5 flex flex-col flex-1">
                <div className="h-2 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-2 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-2 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="h-8 bg-gray-200 rounded w-24 mt-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 mb-4">Failed to load courses</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-500 mt-1">{totalCourses} {totalCourses === 1 ? 'course' : 'courses'} found</p>
        </div>
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <label htmlFor="course-search" className="sr-only">Search courses</label>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            id="course-search"
            type="search"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6" role="search" aria-label="Course filters">
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap items-end">
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="level-filter" className="block text-xs font-medium text-gray-500 mb-1.5">Level</label>
            <select
              id="level-filter"
              value={selectedLevel}
              onChange={(e) => handleLevelChange(e.target.value as LevelValue)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label htmlFor="price-filter" className="block text-xs font-medium text-gray-500 mb-1.5">Price</label>
            <select
              id="price-filter"
              value={selectedPrice}
              onChange={(e) => handlePriceChange(e.target.value as PriceValue)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="all">All</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="sort-filter" className="block text-xs font-medium text-gray-500 mb-1.5">Sort by</label>
            <select
              id="sort-filter"
              value={selectedSort}
              onChange={(e) => handleSortChange(e.target.value as SortValue)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="popular">Popular</option>
              <option value="newest">Newest</option>
              <option value="price">Price</option>
            </select>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSelectedLevel('all');
                setSelectedPrice('all');
                setSelectedSort('popular');
                setSearchQuery('');
                setSearchParams({});
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyState hasActiveFilters={hasActiveFilters} onClearFilters={() => {
          setSelectedLevel('all');
          setSelectedPrice('all');
          setSelectedSort('popular');
          setSearchQuery('');
          setSearchParams({});
          setCurrentPage(1);
        }} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </div>

          <Pagination currentPage={currentPage} totalPages={Math.ceil((data?.meta?.total ?? 0) / 12)} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
  );
}
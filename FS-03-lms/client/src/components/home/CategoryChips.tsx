import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const categories = [
  { id: 'all', label: 'All', count: 20 },
  { id: 'Web Development', label: 'Web Development', count: 5 },
  { id: 'Data Science', label: 'Data Science', count: 3 },
  { id: 'Mobile Development', label: 'Mobile Dev', count: 2 },
  { id: 'Machine Learning', label: 'ML & AI', count: 2 },
  { id: 'DevOps', label: 'DevOps', count: 2 },
  { id: 'Design', label: 'Design', count: 2 },
  { id: 'Business', label: 'Business', count: 2 },
  { id: 'Security', label: 'Security', count: 2 },
];

const levels = [
  { id: 'all', label: 'All Levels' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

export default function CategoryChips() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedLevel, setSelectedLevel] = useState(searchParams.get('level') || 'all');

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const params = new URLSearchParams(searchParams);
    if (categoryId === 'all') {
      params.delete('category');
    } else {
      params.set('category', categoryId);
    }
    setSearchParams(params);
  };

  const handleLevelChange = (levelId: string) => {
    setSelectedLevel(levelId);
    const params = new URLSearchParams(searchParams);
    if (levelId === 'all') {
      params.delete('level');
    } else {
      params.set('level', levelId);
    }
    setSearchParams(params);
  };

  const hasFilters = selectedCategory !== 'all' || selectedLevel !== 'all';

  return (
    <section className="py-8 lg:py-12 bg-white border-y border-gray-100" aria-labelledby="filters-heading">
      <h2 id="filters-heading" className="sr-only">Filter Courses</h2>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Categories:</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Course categories">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                  aria-pressed={selectedCategory === cat.id}
                >
                  {cat.label}
                  <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${selectedCategory === cat.id ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <span className="text-sm font-medium text-gray-500 hidden sm:inline">Level:</span>
            <div className="flex gap-2" role="group" aria-label="Difficulty levels">
              {levels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => handleLevelChange(level.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                    selectedLevel === level.id
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                  aria-pressed={selectedLevel === level.id}
                >
                  {level.label}
                </button>
              ))}
            </div>
            {hasFilters && (
              <Link
                to="/courses"
                className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                Clear filters
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
interface EmptyStateProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export default function EmptyState({ hasActiveFilters, onClearFilters }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses found</h3>
      <p className="text-gray-500 mb-6">Try adjusting your filters or search terms</p>
      {hasActiveFilters && (
        <button onClick={onClearFilters} className="px-6 py-3 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700">
          Clear all filters
        </button>
      )}
    </div>
  );
}
/**
 * Skeleton Loader Components
 * Provides skeleton screens for better loading UX
 */

export function SkeletonCard() {
  return (
    <div className="animate-pulse bg-gray-700 rounded-lg p-4 space-y-3">
      <div className="h-4 bg-gray-600 rounded w-3/4"></div>
      <div className="h-8 bg-gray-600 rounded w-1/2"></div>
      <div className="h-3 bg-gray-600 rounded w-full"></div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center space-x-3 p-2">
          <div className="h-8 w-8 bg-gray-600 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-600 rounded w-3/4"></div>
            <div className="h-3 bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="animate-pulse bg-gray-700 rounded-lg p-4 h-full">
      <div className="h-6 bg-gray-600 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="h-4 bg-gray-600 rounded" style={{ width: `${Math.random() * 60 + 20}%` }}></div>
            <div className="h-4 bg-gray-600 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonMap() {
  return (
    <div className="animate-pulse bg-gray-800 w-full h-full flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-400 text-sm">Loading map...</p>
      </div>
    </div>
  );
}

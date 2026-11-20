'use client';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-muted ${className}`}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-8" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
      <Skeleton className="mt-4 h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`skeleton ${className}`} />
  );
}

export function SkeletonKPI() {
  return (
    <div className="kpi">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-32 mt-1" />
      <Skeleton className="h-3 w-24 mt-1" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

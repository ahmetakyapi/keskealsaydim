import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

function ShimmerBlock({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton-shimmer inline-block', className)} {...props} />;
}

function ShimmerLine({ className, width = '100%' }: { className?: string; width?: string }) {
  return <div className={cn('skeleton-shimmer h-3 rounded-lg', className)} style={{ width }} />;
}

function ShimmerCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-5', className)}>
      <div className="flex items-center justify-between">
        <ShimmerLine width="40%" />
        <ShimmerBlock className="h-9 w-9 rounded-xl" />
      </div>
      <ShimmerBlock className="mt-4 h-8 w-32 rounded-lg" />
      <ShimmerLine className="mt-3" width="55%" />
    </div>
  );
}

function ShimmerRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <ShimmerBlock className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <ShimmerLine width="4rem" />
          <ShimmerLine width="6rem" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <ShimmerLine width="5rem" />
        <ShimmerLine width="3.5rem" />
      </div>
    </div>
  );
}

function ShimmerTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <ShimmerRow key={`shimmer-row-${index}`} />
      ))}
    </div>
  );
}

function ShimmerStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <ShimmerCard key={`shimmer-stat-${index}`} />
      ))}
    </div>
  );
}

function PageLoadingState({ message = 'Veriler yükleniyor…' }: { message?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export {
  Skeleton,
  ShimmerBlock,
  ShimmerLine,
  ShimmerCard,
  ShimmerRow,
  ShimmerTable,
  ShimmerStats,
  PageLoadingState,
};

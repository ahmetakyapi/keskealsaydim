import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

function ShimmerBlock({
  className,
  ...props
}: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn('skeleton-shimmer', className)}
      {...props}
    />
  );
}

function ShimmerLine({
  className,
  width = '100%',
}: Readonly<{
  className?: string;
  width?: string;
}>) {
  return (
    <div
      className={cn('skeleton-shimmer h-3 rounded-lg', className)}
      style={{ width }}
    />
  );
}

function ShimmerCard({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={cn('skeleton-shimmer rounded-2xl p-6 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-xl skeleton-shimmer" />
        <div className="w-16 h-6 rounded-full skeleton-shimmer" />
      </div>
      <div className="space-y-2">
        <div className="w-24 h-3 rounded-lg skeleton-shimmer" />
        <div className="w-36 h-7 rounded-lg skeleton-shimmer" />
      </div>
    </div>
  );
}

function ShimmerRow({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={cn('skeleton-shimmer rounded-xl p-4 flex items-center justify-between', className)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
        <div className="space-y-2">
          <div className="w-16 h-3 rounded-lg skeleton-shimmer" />
          <div className="w-24 h-3 rounded-lg skeleton-shimmer" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <div className="w-20 h-3 rounded-lg skeleton-shimmer" />
        <div className="w-14 h-3 rounded-lg skeleton-shimmer" />
      </div>
    </div>
  );
}

function ShimmerTable({ rows = 5 }: Readonly<{ rows?: number }>) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <ShimmerRow key={`shimmer-row-${i}`} />
      ))}
    </div>
  );
}

function ShimmerProgress({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between">
        <div className="w-16 h-3 rounded-lg skeleton-shimmer" />
        <div className="w-10 h-3 rounded-lg skeleton-shimmer" />
      </div>
      <div className="w-full h-2 rounded-full skeleton-shimmer" />
    </div>
  );
}

function PageLoadingState({ message = 'Veriler yukleniyor...' }: Readonly<{ message?: string }>) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-primary animate-spin" />
        <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-b-secondary animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
      </div>
      <p className="text-white/50 text-sm animate-pulse">{message}</p>
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
  ShimmerProgress,
  PageLoadingState,
};

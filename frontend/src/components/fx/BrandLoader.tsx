import { cn } from '@/lib/utils';

/**
 * Branded loading mark: a price line that draws itself, lifts off and
 * redraws, with a dot riding its tip. Pure CSS, so it plays before any
 * JavaScript chunk has arrived and the reduced-motion rule freezes it.
 */
export function BrandLoader({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  return (
    <svg
      viewBox="0 0 120 48"
      aria-hidden="true"
      className={cn('brand-loader overflow-visible', size === 'sm' ? 'h-8 w-20' : 'h-12 w-28', className)}
      fill="none"
    >
      <defs>
        <linearGradient id="brand-loader-gradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--secondary))' }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))' }} />
        </linearGradient>
      </defs>
      <path
        className="brand-loader-track stroke-border"
        d="M4 40 L28 30 L44 34 L66 16 L82 22 L116 6"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="brand-loader-line"
        d="M4 40 L28 30 L44 34 L66 16 L82 22 L116 6"
        pathLength={100}
        stroke="url(#brand-loader-gradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

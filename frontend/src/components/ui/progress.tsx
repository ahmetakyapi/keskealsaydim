import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const SIZES = { sm: 'h-1', md: 'h-2', lg: 'h-3' } as const;
const VARIANTS = {
  default: 'bg-primary',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
} as const;

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = 'default', size = 'md', label, ...props }, ref) => {
    const safeMax = max > 0 ? max : 100;
    const percentage = Math.min(Math.max((value / safeMax) * 100, 0), 100);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn('w-full overflow-hidden rounded-full bg-muted', SIZES[size], className)}
        {...props}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', VARIANTS[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };

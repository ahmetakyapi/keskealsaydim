import { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 text-center',
        compact ? 'py-8' : 'py-14',
        className
      )}
    >
      <div
        className={cn(
          'mb-4 flex items-center justify-center rounded-2xl bg-muted',
          compact ? 'h-12 w-12' : 'h-16 w-16'
        )}
      >
        <Icon className={cn('text-muted-foreground', compact ? 'h-6 w-6' : 'h-8 w-8')} aria-hidden="true" />
      </div>
      <h3 className={cn('font-semibold text-foreground', compact ? 'text-base' : 'text-lg')}>{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>

      {(actionLabel || secondaryLabel) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
          {secondaryLabel && onSecondary && (
            <Button variant="outline" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

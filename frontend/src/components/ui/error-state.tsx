import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  retrying?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * The failure counterpart to EmptyState. Screens were rendering their empty
 * state on error, which told users "you have no data yet" when the truth was
 * "we could not load your data".
 */
export function ErrorState({
  error,
  onRetry,
  title = 'Veriler yüklenemedi',
  retrying = false,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center px-4 text-center',
        compact ? 'py-8' : 'py-14',
        className
      )}
    >
      <div
        className={cn(
          'mb-4 flex items-center justify-center rounded-2xl bg-danger/10',
          compact ? 'h-12 w-12' : 'h-16 w-16'
        )}
      >
        <AlertTriangle
          className={cn('text-danger', compact ? 'h-6 w-6' : 'h-8 w-8')}
          aria-hidden="true"
        />
      </div>
      <h3 className={cn('font-semibold text-foreground', compact ? 'text-base' : 'text-lg')}>{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{getApiErrorMessage(error)}</p>

      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry} loading={retrying}>
          {!retrying && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          Tekrar Dene
        </Button>
      )}
    </div>
  );
}

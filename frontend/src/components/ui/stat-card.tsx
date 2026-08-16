import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { Money, Percent } from './value';
import { ShimmerBlock } from './skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  format?: 'currency' | 'percent' | 'number';
  currency?: string;
  /** Renders the value with an explicit sign and directional colour. */
  signed?: boolean;
  icon?: LucideIcon;
  hint?: string;
  footer?: React.ReactNode;
  loading?: boolean;
  className?: string;
  /** Blurs the figure when the user has hidden portfolio values. */
  masked?: boolean;
}

export function StatCard({
  title,
  value,
  format = 'number',
  currency,
  signed = false,
  icon: Icon,
  hint,
  footer,
  loading = false,
  className,
  masked = false,
}: StatCardProps) {
  const body = (() => {
    switch (format) {
      case 'currency':
        return <Money value={value} currency={currency} signed={signed} />;
      case 'percent':
        return <Percent value={value} colored={signed} />;
      default:
        return (
          <span data-numeric="">{new Intl.NumberFormat('tr-TR').format(value)}</span>
        );
    }
  })();

  return (
    <div className={cn('rounded-2xl border border-border bg-card p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{title}</p>
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </span>
        )}
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight sm:text-[26px]">
        {loading ? (
          <ShimmerBlock className="h-8 w-32" />
        ) : (
          <span className={cn(masked && 'select-none blur-sm')}>{body}</span>
        )}
      </p>

      {hint && !loading && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {footer && !loading && <div className="mt-3">{footer}</div>}
    </div>
  );
}

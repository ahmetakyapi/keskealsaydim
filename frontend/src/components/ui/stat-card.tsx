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
    <div
      data-spotlight=""
      className={cn(
        'group min-w-0 rounded-2xl border border-border bg-card p-4 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-primary/30 sm:p-5',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] text-muted-foreground sm:text-sm">{title}</p>
        {Icon && (
          // On a phone the cards sit two to a row; the icon would push the
          // title onto two lines for no information.
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors duration-300 group-hover:bg-primary/15 sm:flex">
            <Icon
              className="h-4 w-4 text-muted-foreground transition-[color,transform] duration-500 group-hover:-rotate-6 group-hover:scale-110 group-hover:text-primary"
              aria-hidden="true"
            />
          </span>
        )}
      </div>

      {/* Scales with the viewport below `sm` so a seven-figure balance still
          fits half a phone's width; `anywhere` is the last resort, not overflow. */}
      <p className="mt-2 text-[clamp(1.05rem,4.6vw,1.5rem)] font-semibold tracking-tight [overflow-wrap:anywhere] sm:mt-3 sm:text-[26px]">
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

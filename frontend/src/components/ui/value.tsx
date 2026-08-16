import * as React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import {
  changeTextClass,
  cn,
  directionOf,
  formatCurrency,
  formatPercent,
  formatPercentValue,
  formatPrice,
  formatSignedCurrency,
} from '@/lib/utils';

/**
 * Rendering money and percentages went wrong in the same three ways all over
 * the app: a lost minus sign, a doubled `+`, and a currency symbol in front of
 * the sign. These components are the single place that logic lives now.
 */

interface MoneyProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  currency?: string;
  /** Show an explicit +/− and colour by direction. For P&L figures. */
  signed?: boolean;
  /** Use price precision (4 decimals below ₺1) instead of money precision. */
  price?: boolean;
}

export function Money({ value, currency, signed = false, price = false, className, ...props }: MoneyProps) {
  const text = signed
    ? formatSignedCurrency(value, currency)
    : price
      ? formatPrice(value, currency)
      : formatCurrency(value, currency);

  return (
    <span
      data-numeric=""
      className={cn(signed && changeTextClass(value), className)}
      {...props}
    >
      {text}
    </span>
  );
}

interface PercentProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  /** Omit the sign when an adjacent arrow already conveys direction. */
  withSign?: boolean;
  colored?: boolean;
  decimals?: number;
}

export function Percent({
  value,
  withSign = true,
  colored = true,
  decimals = 2,
  className,
  ...props
}: PercentProps) {
  return (
    <span
      data-numeric=""
      className={cn(colored && changeTextClass(value), className)}
      {...props}
    >
      {withSign ? formatPercent(value, decimals) : formatPercentValue(Math.abs(value), decimals)}
    </span>
  );
}

interface ChangeBadgeProps {
  value: number;
  /** Optional absolute change shown next to the percentage. */
  amount?: number;
  currency?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Percentage pill with a direction arrow — the standard market-data chip. */
export function ChangeBadge({ value, amount, currency, size = 'md', className }: ChangeBadgeProps) {
  const direction = directionOf(value);
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;

  const tone =
    direction === 'up'
      ? 'border-success/25 bg-success/12 text-success'
      : direction === 'down'
        ? 'border-danger/25 bg-danger/12 text-danger'
        : 'border-border bg-muted text-muted-foreground';

  return (
    <span
      data-numeric=""
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium tabular-nums',
        tone,
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
        className
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" />
      {/* The arrow carries the direction, so the number itself is unsigned. */}
      {formatPercentValue(Math.abs(value))}
      {amount !== undefined && (
        <span className="opacity-70">({formatSignedCurrency(amount, currency)})</span>
      )}
    </span>
  );
}

/** Renders a value that could not be fetched as an explicit gap, not a zero. */
export function UnavailableValue({ label = 'Veri yok' }: { label?: string }) {
  return (
    <span className="text-sm text-muted-foreground" title="Fiyat verisi şu anda alınamıyor">
      {label}
    </span>
  );
}

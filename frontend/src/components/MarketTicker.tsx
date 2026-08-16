import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMarketOverview } from '@/hooks/useQueries';
import { cn, directionOf, formatNumber, formatPercentValue } from '@/lib/utils';

/**
 * Live market strip for the landing page.
 *
 * The old build had a marquee too, but it scrolled hand-entered prices that
 * were months stale. This one is fed by the same `/api/market/overview` the
 * app uses, pauses on hover and on keyboard focus so a reader can actually
 * catch a row, and stops entirely under `prefers-reduced-motion`.
 */
export function MarketTicker({ className }: { className?: string }) {
  const { data, isLoading, isError } = useMarketOverview();

  const quotes = useMemo(() => {
    const all = data?.quotes ?? [];
    // Indices, FX and commodities first — they set the scene; then equities.
    const order = { INDEX: 0, CURRENCY: 1, COMMODITY: 2, BIST: 3, US: 4 } as const;
    return [...all]
      .sort((a, b) => order[a.category] - order[b.category])
      .slice(0, 24);
  }, [data]);

  if (isLoading) {
    return (
      <div className={cn('h-11 border-y border-border bg-surface/60', className)} aria-hidden="true">
        <div className="mx-auto flex h-full max-w-6xl items-center gap-8 overflow-hidden px-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="skeleton-shimmer h-3 w-28 shrink-0 rounded" />
          ))}
        </div>
      </div>
    );
  }

  // A broken data source should not leave a dead grey bar across the page.
  if (isError || quotes.length === 0) return null;

  // Duplicated once so the -50% translate loops seamlessly.
  const loop = [...quotes, ...quotes];

  return (
    <div
      className={cn('relative overflow-hidden border-y border-border bg-surface/60', className)}
      role="region"
      aria-label="Canlı piyasa özeti"
    >
      <div className="marquee">
        {loop.map((quote, index) => {
          const direction = directionOf(quote.changePercent);
          const decimals = quote.category === 'CURRENCY' ? 4 : 2;

          return (
            <Link
              key={`${quote.symbol}-${index}`}
              to={`/stocks/${encodeURIComponent(quote.symbol)}`}
              // The second copy is decoration; keep it out of the a11y tree
              // and the tab order so every row is announced exactly once.
              aria-hidden={index >= quotes.length}
              tabIndex={index >= quotes.length ? -1 : undefined}
              className="flex shrink-0 items-baseline gap-2 border-r border-border px-5 py-3 text-xs transition-colors hover:bg-accent/50"
            >
              <span className="font-medium text-foreground">
                {quote.symbol.replace(/\.IS$/, '').replace(/=X$/, '')}
              </span>
              <span className="text-muted-foreground" data-numeric="">
                {formatNumber(quote.price, decimals)}
              </span>
              <span
                data-numeric=""
                className={cn(
                  'font-medium',
                  direction === 'up' && 'text-success',
                  direction === 'down' && 'text-danger',
                  direction === 'flat' && 'text-muted-foreground'
                )}
              >
                {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '—'}{' '}
                {formatPercentValue(Math.abs(quote.changePercent))}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Fades the strip into the page instead of cutting it off mid-row. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}

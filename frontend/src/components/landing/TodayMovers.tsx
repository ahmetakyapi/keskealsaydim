import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ChangeBadge } from '@/components/ui/value';
import { ShimmerRow } from '@/components/ui/skeleton';
import { RevealGroup, RevealItem } from '@/components/Motion';
import { useMarketOverview } from '@/hooks/useQueries';
import { cn, formatNumber } from '@/lib/utils';
import type { MarketQuote } from '@/types';

/**
 * Today's biggest movers, from the same live overview the app uses.
 *
 * Deliberately equities only: mixing FX and gold into a "movers" list makes
 * the ranking meaningless, since a 0.3% currency move and a 6% share move are
 * not the same kind of event.
 */
export function TodayMovers() {
  const { data, isLoading, isError } = useMarketOverview();

  const { gainers, losers } = useMemo(() => {
    const equities = (data?.quotes ?? []).filter(
      (quote) => quote.category === 'BIST' || quote.category === 'US'
    );
    const sorted = [...equities].sort((a, b) => b.changePercent - a.changePercent);
    return {
      gainers: sorted.filter((quote) => quote.changePercent > 0).slice(0, 5),
      losers: sorted
        .filter((quote) => quote.changePercent < 0)
        .slice(-5)
        .reverse(),
    };
  }, [data]);

  // Nothing to rank on a flat day, and nothing worth a dead panel on failure.
  if (isError || (!isLoading && gainers.length === 0 && losers.length === 0)) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <MoverColumn
        title="Bugün En Çok Yükselenler"
        icon={TrendingUp}
        tone="success"
        quotes={gainers}
        loading={isLoading}
      />
      <MoverColumn
        title="Bugün En Çok Düşenler"
        icon={TrendingDown}
        tone="danger"
        quotes={losers}
        loading={isLoading}
      />
    </div>
  );
}

function MoverColumn({
  title,
  icon: Icon,
  tone,
  quotes,
  loading,
}: {
  title: string;
  icon: typeof TrendingUp;
  tone: 'success' | 'danger';
  quotes: MarketQuote[];
  loading: boolean;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="display-sm flex items-center gap-2 text-base">
        <Icon
          className={cn('h-4 w-4', tone === 'success' ? 'text-success' : 'text-danger')}
          aria-hidden="true"
        />
        {title}
      </h3>

      {loading ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <ShimmerRow key={index} />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Bugün bu yönde hareket eden hisse yok.
        </p>
      ) : (
        <RevealGroup className="mt-2 divide-y divide-border" stagger={0.05}>
          {quotes.map((quote) => (
            <RevealItem key={quote.symbol}>
              <Link
                to={`/stocks/${encodeURIComponent(quote.symbol)}`}
                className="group flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-accent/40"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-medium">
                    {quote.symbol.replace(/\.IS$/, '')}
                    <ArrowUpRight
                      className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{quote.name}</span>
                </span>

                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-sm" data-numeric="">
                    {formatNumber(quote.price)}
                  </span>
                  <ChangeBadge value={quote.changePercent} size="sm" />
                </span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </Card>
  );
}

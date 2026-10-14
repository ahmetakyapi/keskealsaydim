import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, BellRing, Check, Copy, Link2, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ShimmerLine } from '@/components/ui/skeleton';
import { useDemoComparison, useMarketOverview } from '@/hooks/useQueries';
import { distanceToTarget } from '@/lib/alerts';
import { downsample } from '@/lib/chart';
import {
  cn,
  formatCurrency,
  formatNumber,
  formatPercentValue,
  formatPrice,
  formatSignedCurrency,
} from '@/lib/utils';
import type { MarketQuote } from '@/types';

/**
 * Miniature renderings of real app screens, for the feature showcase.
 *
 * These are built from the same tokens and the same layout rules as the real
 * screens rather than being screenshots: they stay correct in both themes,
 * they scale with the type system, and they cannot drift out of date the way
 * an exported PNG does.
 *
 * Every figure in them is live. They used to carry hand-typed numbers
 * (₺93.169,40, a 142-view counter, THYAO at 305,25) that disagreed with the
 * live demo a few hundred pixels above. Now the compare preview reads the
 * hero's own query (same cache key, no extra request), and the portfolio and
 * alert previews price an example — labelled as one — with the quotes the
 * ticker already fetched.
 */

/** The hero's default scenario; sharing its query key shares its cache. */
const DEMO = { a: 'THYAO', b: 'ASELS', years: 3, amount: 10_000 } as const;

/** Example holdings for the portfolio preview. Quantities are illustrative. */
const EXAMPLE_HOLDINGS = [
  { symbol: 'AAPL', name: 'Apple', quantity: 10 },
  { symbol: 'THYAO.IS', name: 'Türk Hava Yolları', quantity: 100 },
  { symbol: 'ASELS.IS', name: 'Aselsan', quantity: 300 },
] as const;

function useQuoteMap() {
  const { data, isLoading } = useMarketOverview();
  const quotes = useMemo(() => {
    const map = new Map<string, MarketQuote>();
    for (const quote of data?.quotes ?? []) map.set(quote.symbol.toUpperCase(), quote);
    return map;
  }, [data]);
  return { quotes, usdTry: data?.usdTry ?? 0, isLoading };
}

function PreviewLoading() {
  return (
    <div className="space-y-2.5 py-1" aria-hidden="true">
      <ShimmerLine width="55%" />
      <ShimmerLine width="85%" />
      <ShimmerLine width="70%" />
    </div>
  );
}

function PreviewUnavailable() {
  return (
    <p className="py-3 text-xs text-muted-foreground">
      Canlı veri şu anda alınamadı; birazdan tekrar deneyin.
    </p>
  );
}

function Chrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
      <div className="flex items-center gap-2 border-b border-border bg-surface-raised/60 px-3 py-2">
        <span className="flex gap-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Row({
  symbol,
  name,
  value,
  percent,
}: {
  symbol: string;
  name: string;
  value: number;
  percent: number;
}) {
  const up = percent >= 0;
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block text-xs font-semibold">{symbol}</span>
        <span className="block truncate text-xs text-muted-foreground">{name}</span>
      </span>
      <span className="text-right">
        <span className="block text-xs font-semibold" data-numeric="">
          {formatCurrency(value)}
        </span>
        <span
          className={cn(
            'flex items-center justify-end gap-0.5 text-xs font-medium',
            up ? 'text-success' : 'text-danger'
          )}
          data-numeric=""
        >
          {up ? (
            <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
          ) : (
            <ArrowDownRight className="h-2.5 w-2.5" aria-hidden="true" />
          )}
          {formatPercentValue(Math.abs(percent))}
        </span>
      </span>
    </li>
  );
}

export function PortfolioPreview() {
  const { quotes, usdTry, isLoading } = useQuoteMap();

  const rows = EXAMPLE_HOLDINGS.flatMap((holding) => {
    const quote = quotes.get(holding.symbol);
    if (!quote || quote.price <= 0) return [];
    const fx = quote.currency === 'USD' ? usdTry : quote.currency === 'TRY' ? 1 : 0;
    if (fx <= 0) return [];
    return [
      {
        symbol: holding.symbol.replace(/\.IS$/, ''),
        quantity: holding.quantity,
        name: holding.name,
        value: holding.quantity * quote.price * fx,
        dayChange: holding.quantity * quote.change * fx,
        percent: quote.changePercent,
      },
    ];
  });

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const dayChange = rows.reduce((sum, row) => sum + row.dayChange, 0);

  return (
    <Chrome title="Portföyüm">
      {isLoading ? (
        <PreviewLoading />
      ) : rows.length === 0 ? (
        <PreviewUnavailable />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted p-2">
              <p className="text-xs text-muted-foreground">Toplam Değer</p>
              <p className="mt-0.5 text-sm font-semibold" data-numeric="">
                {formatCurrency(total)}
              </p>
            </div>
            <div className={cn('rounded-lg p-2', dayChange >= 0 ? 'bg-success/10' : 'bg-danger/10')}>
              <p className="text-xs text-muted-foreground">Bugünkü Değişim</p>
              <p
                className={cn(
                  'mt-0.5 text-sm font-semibold',
                  dayChange >= 0 ? 'text-success' : 'text-danger'
                )}
                data-numeric=""
              >
                {formatSignedCurrency(dayChange)}
              </p>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <Row
                key={row.symbol}
                symbol={`${row.quantity} ${row.symbol}`}
                name={row.name}
                value={row.value}
                percent={row.percent}
              />
            ))}
          </ul>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Wallet className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
            Örnek adetler, canlı fiyatlar; dolar fiyatları kurla TL'ye çevrilir
          </p>
        </>
      )}
    </Chrome>
  );
}

/** A round target about 10% away, the kind of level people actually set. */
function exampleTarget(price: number, direction: 'ABOVE' | 'BELOW'): number {
  const step = price >= 100 ? 10 : price >= 10 ? 1 : 0.1;
  const raw = price * (direction === 'ABOVE' ? 1.1 : 0.9);
  return direction === 'ABOVE' ? Math.ceil(raw / step) * step : Math.floor(raw / step) * step;
}

export function AlertPreview() {
  const { quotes, isLoading } = useQuoteMap();

  const alerts = (
    [
      { symbol: 'THYAO.IS', direction: 'ABOVE' },
      { symbol: 'ASELS.IS', direction: 'BELOW' },
    ] as const
  ).flatMap((example) => {
    const quote = quotes.get(example.symbol);
    if (!quote || quote.price <= 0) return [];
    const target = exampleTarget(quote.price, example.direction);
    const distance = distanceToTarget(quote.price, target, example.direction);
    return distance
      ? [{ ...example, label: example.symbol.replace(/\.IS$/, ''), price: quote.price, target, distance }]
      : [];
  });

  return (
    <Chrome title="Fiyat Alarmları">
      {isLoading ? (
        <PreviewLoading />
      ) : alerts.length === 0 ? (
        <PreviewUnavailable />
      ) : (
        <>
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li key={alert.symbol} className="rounded-lg border border-border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{alert.label}</span>
                  <Badge variant="default" size="sm">
                    Aktif
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground" data-numeric="">
                  {formatPrice(alert.target)}{' '}
                  {alert.direction === 'ABOVE' ? 'üstüne çıkarsa' : 'altına inerse'} · Güncel{' '}
                  {formatPrice(alert.price)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground" data-numeric="">
                  Hedefe {formatPercentValue(Math.abs(alert.distance.movePercent), 1)}{' '}
                  {alert.distance.movePercent > 0 ? 'yükseliş' : 'düşüş'} kaldı
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted p-2">
            <BellRing className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">
              Örnek hedefler, canlı fiyatlar. Hedefe ulaşıldığında bildirim listenize bir kayıt
              düşer.
            </p>
          </div>
        </>
      )}
    </Chrome>
  );
}

/** Two polylines on one scale, from the scenario's own daily values. */
function sparkPaths(series: Array<{ valueA: number; valueB: number }>) {
  const points = downsample(series, 48);
  if (points.length < 2) return null;
  const values = points.flatMap((point) => [point.valueA, point.valueB]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const toPath = (pick: (point: (typeof points)[number]) => number) =>
    points
      .map((point, index) => {
        const x = (index / (points.length - 1)) * 200;
        const y = 44 - ((pick(point) - min) / span) * 40;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  return { a: toPath((point) => point.valueA), b: toPath((point) => point.valueB) };
}

export function ComparePreview() {
  const demo = useDemoComparison(DEMO.a, DEMO.b, DEMO.years, DEMO.amount);
  const result = demo.data;
  const paths = useMemo(() => (result ? sparkPaths(result.result.series ?? []) : null), [result]);

  if (!result) {
    return (
      <Chrome title="Karşılaştır">
        {demo.isError ? <PreviewUnavailable /> : <PreviewLoading />}
      </Chrome>
    );
  }

  const { symbolA: legA, symbolB: legB, difference, metrics } = result.result;
  const winnerIsB = difference.winnerSymbol === 'B';
  const gap = Math.abs(legB.endValue - legA.endValue);

  return (
    <Chrome title="Karşılaştır">
      <div
        className={cn(
          'rounded-lg border p-2.5',
          winnerIsB ? 'border-danger/25 bg-danger/[0.06]' : 'border-success/25 bg-success/[0.06]'
        )}
      >
        <p className="text-xs text-muted-foreground">
          {DEMO.years} yıl önce {formatCurrency(DEMO.amount)} ile
        </p>
        <p className="mt-1 text-sm font-semibold leading-snug">
          {winnerIsB ? (
            <>
              <span className="text-danger">{result.symbolB}</span> alsaydınız{' '}
              <span data-numeric="">{formatCurrency(gap)}</span> daha fazlanız olurdu.
            </>
          ) : (
            <>
              İyi ki <span className="text-success">{result.symbolA}</span> almışsınız:{' '}
              {result.symbolB} alsaydınız <span data-numeric="">{formatCurrency(gap)}</span> daha
              azınız olurdu.
            </>
          )}
        </p>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Oynaklık', value: formatPercentValue(metrics.symbolBVolatility, 1) },
          { label: 'Korelasyon', value: formatNumber(metrics.correlation, 2) },
          { label: 'En Sert Düşüş', value: formatPercentValue(legB.maxDrawdown, 1) },
        ].map((metric) => (
          <div key={metric.label} className="rounded-lg bg-muted p-1.5">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="text-xs font-semibold" data-numeric="">
              {metric.value}
            </p>
          </div>
        ))}
      </div>
      {paths && (
        <svg viewBox="0 0 200 48" className="mt-2 h-12 w-full" aria-hidden="true" preserveAspectRatio="none">
          <path d={paths.a} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <path d={paths.b} fill="none" stroke="hsl(var(--secondary))" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {result.symbolA} ve {result.symbolB}, gerçek kapanışlarla; oynaklık ve düşüş{' '}
        {result.symbolB} için.
      </p>
    </Chrome>
  );
}

export function SharePreview() {
  return (
    <Chrome title="Paylaşılan Senaryo">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-2 py-1.5">
        <Link2 className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <code className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          keskealsaydim.vercel.app/s/8f3a…
        </code>
        <Copy className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="mt-2.5 rounded-lg border border-border p-2.5">
        <p className="text-xs font-semibold">THYAO - ASELS</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Alıcı hesap açmadan sonucu görebilir.
        </p>
      </div>

      <ul className="mt-2 space-y-1">
        {['Genel bağlantı', 'Görüntülenme sayısı', 'İstediğinizde silme'].map((item) => (
          <li key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="h-2.5 w-2.5 text-success" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </Chrome>
  );
}

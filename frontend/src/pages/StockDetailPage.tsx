import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowLeft, BellPlus, GitCompare, Plus, Star, StarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader } from '@/components/ui/page-header';
import { ShimmerBlock, ShimmerStats } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChangeBadge } from '@/components/ui/value';
import {
  useAddWatchlistItem,
  useRemoveWatchlistItem,
  useStockHistory,
  useStockQuote,
  useWatchlist,
} from '@/hooks/useQueries';
import { useChartPalette } from '@/hooks/useChartPalette';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { axisDefaults } from '@/lib/chart';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  formatCompact,
  formatDate,
  formatDateTime,
  formatPrice,
  subtractMonths,
  subtractYears,
  toISODate,
  TODAY_ISO,
} from '@/lib/utils';

/**
 * Every list in the app rendered rows as clickable but had nowhere to send
 * them. This is that destination: one symbol, its price history, and the
 * actions that were previously only reachable by retyping the ticker.
 */

const RANGES = [
  { value: '1M', label: '1 Ay', months: 1, interval: '1d' },
  { value: '3M', label: '3 Ay', months: 3, interval: '1d' },
  { value: '6M', label: '6 Ay', months: 6, interval: '1d' },
  { value: '1Y', label: '1 Yıl', months: 12, interval: '1d' },
  { value: '5Y', label: '5 Yıl', months: 60, interval: '1wk' },
] as const;

type RangeValue = (typeof RANGES)[number]['value'];

export default function StockDetailPage() {
  const { symbol = '' } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const palette = useChartPalette();

  const [range, setRange] = useState<RangeValue>('1Y');

  const rangeConfig = RANGES.find((item) => item.value === range) ?? RANGES[3];
  const { from, to } = useMemo(() => {
    const today = new Date();
    const start =
      rangeConfig.months >= 12
        ? subtractYears(today, rangeConfig.months / 12)
        : subtractMonths(today, rangeConfig.months);
    return { from: toISODate(start), to: TODAY_ISO() };
  }, [rangeConfig.months]);

  const quoteQuery = useStockQuote(symbol);
  const historyQuery = useStockHistory(symbol, from, to, rangeConfig.interval);
  const watchlistQuery = useWatchlist();
  const addToWatchlist = useAddWatchlistItem();
  const removeFromWatchlist = useRemoveWatchlistItem();

  const quote = quoteQuery.data;
  useDocumentTitle(quote?.name ? `${symbol} · ${quote.name}` : symbol);

  const watchlistEntry = watchlistQuery.data?.find(
    (item) => item.symbol.toUpperCase() === symbol.toUpperCase()
  );

  const chartData = useMemo(() => {
    const points = historyQuery.data?.data ?? [];
    return points.map((point) => ({
      date: point.date,
      close: point.adjustedClose > 0 ? point.adjustedClose : point.close,
    }));
  }, [historyQuery.data]);

  const rangeReturn = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].close;
    const last = chartData[chartData.length - 1].close;
    if (first <= 0) return null;
    return ((last - first) / first) * 100;
  }, [chartData]);

  const currency = quote?.currency ?? 'TRY';

  const handleWatchlistToggle = async () => {
    try {
      if (watchlistEntry) {
        await removeFromWatchlist.mutateAsync(watchlistEntry.id);
        toast.success(`${symbol} izleme listesinden çıkarıldı`);
      } else {
        await addToWatchlist.mutateAsync({ symbol, symbolName: quote?.name });
        toast.success(`${symbol} izleme listesine eklendi`);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  if (quoteQuery.isError) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Geri
        </Button>
        <Card>
          <ErrorState
            error={quoteQuery.error}
            title={`${symbol} bulunamadı`}
            onRetry={() => void quoteQuery.refetch()}
            retrying={quoteQuery.isFetching}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Geri
      </Button>

      <PageHeader
        title={symbol.replace(/\.IS$/, '')}
        description={quote?.name}
        meta={
          <>
            {quote?.exchange && <Badge variant="outline">{quote.exchange}</Badge>}
            {currency !== 'TRY' && (
              <Badge variant="warning" size="sm">
                {currency} cinsinden işlem görüyor
              </Badge>
            )}
            {quote?.lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Son güncelleme: {formatDateTime(quote.lastUpdated)}
              </span>
            )}
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void handleWatchlistToggle()}>
              {watchlistEntry ? (
                <>
                  <StarOff className="h-4 w-4" aria-hidden="true" />
                  Listeden Çıkar
                </>
              ) : (
                <>
                  <Star className="h-4 w-4" aria-hidden="true" />
                  İzlemeye Al
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/alerts?symbol=${encodeURIComponent(symbol)}`}>
                <BellPlus className="h-4 w-4" aria-hidden="true" />
                Alarm Kur
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/portfolio?add=${encodeURIComponent(symbol)}`}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Portföye Ekle
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to={`/compare?a=${encodeURIComponent(symbol)}`}>
                <GitCompare className="h-4 w-4" aria-hidden="true" />
                Karşılaştır
              </Link>
            </Button>
          </>
        }
      />

      {quoteQuery.isLoading ? (
        <ShimmerStats count={4} />
      ) : quote ? (
        <Card>
          <CardContent className="flex flex-wrap items-end justify-between gap-4 pt-5 sm:pt-6">
            <div>
              <p className="text-3xl font-semibold tracking-tight sm:text-4xl" data-numeric="">
                {formatPrice(quote.price, currency)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ChangeBadge value={quote.changePercent} amount={quote.change} currency={currency} />
                <span className="text-xs text-muted-foreground">bugün</span>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
              <Stat label="Açılış" value={formatPrice(quote.open, currency)} />
              <Stat label="Gün Yüksek" value={formatPrice(quote.high, currency)} />
              <Stat label="Gün Düşük" value={formatPrice(quote.low, currency)} />
              <Stat label="Önceki Kapanış" value={formatPrice(quote.previousClose, currency)} />
              <Stat label="52H Yüksek" value={formatPrice(quote.week52High, currency)} />
              <Stat label="52H Düşük" value={formatPrice(quote.week52Low, currency)} />
              <Stat label="Hacim" value={quote.volume > 0 ? formatCompact(quote.volume) : '—'} />
              <Stat
                label="Piyasa Değeri"
                value={quote.marketCap > 0 ? formatCompact(quote.marketCap) : '—'}
              />
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Fiyat Grafiği</CardTitle>
            {rangeReturn !== null && (
              <p className="mt-1 text-sm text-muted-foreground">
                Seçili dönem getirisi:{' '}
                <span className={rangeReturn >= 0 ? 'text-success' : 'text-danger'}>
                  {rangeReturn >= 0 ? '+' : '−'}%{Math.abs(rangeReturn).toFixed(2)}
                </span>
              </p>
            )}
          </div>

          <Tabs value={range} onValueChange={(value) => setRange(value as RangeValue)}>
            <TabsList>
              {RANGES.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          <div className="h-[320px] w-full">
            {historyQuery.isLoading ? (
              <ShimmerBlock className="h-full w-full rounded-xl" />
            ) : historyQuery.isError ? (
              <ErrorState
                error={historyQuery.error}
                title="Grafik verisi yüklenemedi"
                onRetry={() => void historyQuery.refetch()}
                retrying={historyQuery.isFetching}
                compact
              />
            ) : chartData.length < 2 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Bu aralıkta yeterli veri bulunamadı.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stock-detail-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette.series[0]} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={palette.series[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    {...axisDefaults(palette)}
                    minTickGap={40}
                    tickFormatter={(value: string) => formatDate(value).slice(0, 5)}
                  />
                  <YAxis
                    {...axisDefaults(palette)}
                    width={64}
                    domain={['auto', 'auto']}
                    tickFormatter={(value: number) => formatCompact(value)}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: palette.tooltipBg,
                      border: `1px solid ${palette.tooltipBorder}`,
                      borderRadius: 12,
                      color: palette.text,
                      fontSize: 12,
                    }}
                    labelFormatter={(value) => formatDate(String(value))}
                    formatter={(value: number) => [formatPrice(value, currency), 'Kapanış']}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={palette.series[0]}
                    strokeWidth={2}
                    fill="url(#stock-detail-fill)"
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium" data-numeric="">
        {value}
      </dd>
    </div>
  );
}

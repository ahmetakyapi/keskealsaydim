import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Money, Percent } from '@/components/ui/value';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useChartPalette } from '@/hooks/useChartPalette';
import { axisDefaults, downsample } from '@/lib/chart';
import {
  cn,
  formatCompact,
  formatCurrency,
  formatDate,
  formatLongDate,
  formatNumber,
} from '@/lib/utils';
import type { CompareResultData } from '@/types';

interface CompareResultViewProps {
  symbolA: string;
  symbolAName: string;
  symbolB: string;
  symbolBName: string;
  startDate: string;
  endDate: string;
  amount: number;
  amountType: 'MONEY' | 'QUANTITY';
  result: CompareResultData;
}

/**
 * The comparison verdict. Shared by the interactive page and the public share
 * link so both always tell the same story.
 *
 * Two rules the earlier version broke: labels come from the *result*, never
 * from live form state (swapping the inputs used to relabel a finished
 * calculation), and the amount difference keeps its sign.
 */
export function CompareResultView({
  symbolA,
  symbolAName,
  symbolB,
  symbolBName,
  startDate,
  endDate,
  amount,
  amountType,
  result,
}: CompareResultViewProps) {
  const palette = useChartPalette();
  const { symbolA: legA, symbolB: legB, difference, metrics, series } = result;

  const winnerIsB = difference.winnerSymbol === 'B';
  const winnerSymbol = winnerIsB ? symbolB : symbolA;
  const loserSymbol = winnerIsB ? symbolA : symbolB;
  const winnerLeg = winnerIsB ? legB : legA;
  const loserLeg = winnerIsB ? legA : legB;

  // Signed: how much more the winner ended up with. The API returns the
  // absolute gap, so the direction is derived here from the two end values.
  const valueGap = winnerLeg.endValue - loserLeg.endValue;
  const pointGap = Math.abs(difference.percentagePoints);

  const chartData = useMemo(
    () =>
      downsample(
        (series ?? []).map((point) => ({
          date: point.date,
          [symbolA]: point.valueA,
          [symbolB]: point.valueB,
        })),
        260
      ),
    [series, symbolA, symbolB]
  );

  const tie = Math.abs(difference.percentagePoints) < 0.005;

  return (
    <div className="space-y-4">
      {/* Verdict */}
      <Card
        className={cn(
          'overflow-hidden border-2',
          tie ? 'border-border' : winnerIsB ? 'border-danger/30' : 'border-success/30'
        )}
      >
        <CardContent className="pt-5 sm:pt-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{formatLongDate(startDate)}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{formatLongDate(endDate)}</span>
            <span aria-hidden="true">·</span>
            <span>
              {amountType === 'MONEY'
                ? `${formatCurrency(amount)} yatırım`
                : `${formatNumber(amount, 0)} adet`}
            </span>
            <span aria-hidden="true">·</span>
            <span>{metrics.tradingDays} işlem günü</span>
          </div>

          {tie ? (
            <p className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              İki seçenek de neredeyse aynı sonucu verdi.
            </p>
          ) : (
            <p className="mt-3 text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
              <span className={winnerIsB ? 'text-danger' : 'text-success'}>{winnerSymbol}</span>{' '}
              alsaydınız,{' '}
              <Money value={Math.abs(valueGap)} className="font-semibold" /> daha fazla paranız
              olurdu.
            </p>
          )}

          <p className="mt-2 text-sm text-muted-foreground">
            {winnerSymbol} bu dönemde {loserSymbol} karşısında{' '}
            <span className="font-medium text-foreground">
              {formatNumber(pointGap)} puan
            </span>{' '}
            önde bitirdi.
          </p>

          {winnerIsB && difference.missedOpportunity && !tie && (
            <Badge variant="danger" className="mt-3">
              Kaçırılan fırsat
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Legs */}
      <div className="grid gap-4 md:grid-cols-2">
        <LegCard
          label="Aldığınız"
          symbol={symbolA}
          name={symbolAName}
          leg={legA}
          amountType={amountType}
          isWinner={!winnerIsB && !tie}
          accent={palette.series[0]}
        />
        <LegCard
          label="Alabileceğiniz"
          symbol={symbolB}
          name={symbolBName}
          leg={legB}
          amountType={amountType}
          isWinner={winnerIsB && !tie}
          accent={palette.series[1]}
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Değer Gelişimi</CardTitle>
          <p className="text-sm text-muted-foreground">
            Her iki pozisyonun gün gün Türk lirası karşılığı. Farklı para birimindeki hisseler o
            günün kuruyla çevrilmiştir.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full">
            {chartData.length < 2 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Grafik için yeterli veri yok.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    {...axisDefaults(palette)}
                    minTickGap={48}
                    tickFormatter={(value: string) => formatDate(value).slice(0, 5)}
                  />
                  <YAxis
                    {...axisDefaults(palette)}
                    width={64}
                    tickFormatter={(value: number) => `₺${formatCompact(value)}`}
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
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: palette.muted, paddingTop: 8 }}
                    iconType="plainline"
                  />
                  {/* The starting capital, so gains and losses read at a glance. */}
                  {amountType === 'MONEY' && (
                    <ReferenceLine
                      y={amount}
                      stroke={palette.muted}
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey={symbolA}
                    stroke={palette.series[0]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={symbolB}
                    stroke={palette.series[1]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Risk metrics — computed all along but never shown before. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Risk Göstergeleri
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <MetricBlock
            label="Yıllık Oynaklık"
            hint="Getirilerin standart sapmasının yıllığa çevrilmiş hâli. Yüksek değer, fiyatın daha sert dalgalandığı anlamına gelir."
            rows={[
              { name: symbolA, value: `%${formatNumber(metrics.symbolAVolatility)}` },
              { name: symbolB, value: `%${formatNumber(metrics.symbolBVolatility)}` },
            ]}
          />
          <MetricBlock
            label="En Sert Düşüş"
            hint="Dönem içindeki en yüksek değerden en düşük değere kadar yaşanan en büyük kayıp."
            rows={[
              { name: symbolA, value: `%${formatNumber(legA.maxDrawdown)}` },
              { name: symbolB, value: `%${formatNumber(legB.maxDrawdown)}` },
            ]}
          />
          <div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Korelasyon
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="Korelasyon nedir?" className="text-muted-foreground">
                    <Activity className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  −1 ile +1 arasında bir değer. +1'e yakınsa iki hisse birlikte hareket eder, 0'a
                  yakınsa birbirinden bağımsızdır.
                </TooltipContent>
              </Tooltip>
            </p>
            <p className="mt-2 text-2xl font-semibold" data-numeric="">
              {formatNumber(metrics.correlation, 2)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {metrics.correlation > 0.7
                ? 'Neredeyse birlikte hareket ediyorlar'
                : metrics.correlation > 0.3
                  ? 'Kısmen birlikte hareket ediyorlar'
                  : metrics.correlation > -0.3
                    ? 'Birbirinden büyük ölçüde bağımsızlar'
                    : 'Ters yönde hareket ediyorlar'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LegCard({
  label,
  symbol,
  name,
  leg,
  amountType,
  isWinner,
  accent,
}: {
  label: string;
  symbol: string;
  name: string;
  leg: CompareResultData['symbolA'];
  amountType: 'MONEY' | 'QUANTITY';
  isWinner: boolean;
  accent: string;
}) {
  const Icon = leg.profit >= 0 ? TrendingUp : TrendingDown;

  return (
    <Card className={cn(isWinner && 'ring-1 ring-primary/40')}>
      <CardContent className="pt-5 sm:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
              />
              {symbol}
            </p>
            <p className="truncate text-sm text-muted-foreground">{name}</p>
          </div>
          {isWinner && <Badge variant="success">Kazanan</Badge>}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Alış Fiyatı</dt>
            <dd data-numeric="">
              <Money value={leg.startPrice} currency={leg.currency} price />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Bugünkü Fiyat</dt>
            <dd data-numeric="">
              <Money value={leg.endPrice} currency={leg.currency} price />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Adet</dt>
            <dd data-numeric="">{formatNumber(leg.quantity, leg.quantity < 10 ? 4 : 2)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {amountType === 'MONEY' ? 'Başlangıç Değeri' : 'Başlangıç Maliyeti'}
            </dt>
            <dd data-numeric="">
              <Money value={leg.startValue} />
            </dd>
          </div>
        </dl>

        <div className="mt-4 rounded-xl bg-muted p-3">
          <p className="text-xs text-muted-foreground">Bugünkü Değer</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight" data-numeric="">
            <Money value={leg.endValue} />
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm">
            <Icon
              className={cn('h-4 w-4', leg.profit >= 0 ? 'text-success' : 'text-danger')}
              aria-hidden="true"
            />
            <Money value={leg.profit} signed />
            <Percent value={leg.profitPercent} className="text-xs" />
          </p>
        </div>

        {leg.currency !== 'TRY' && (
          <p className="mt-3 text-xs text-muted-foreground">
            Fiyatlar {leg.currency} cinsindendir; değerler işlem günündeki kurdan TL'ye
            çevrilmiştir.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MetricBlock({
  label,
  hint,
  rows,
}: {
  label: string;
  hint: string;
  rows: Array<{ name: string; value: string }>;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label={`${label} nedir?`} className="text-muted-foreground">
              <Activity className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{hint}</TooltipContent>
        </Tooltip>
      </p>
      <dl className="mt-2 space-y-1.5">
        {rows.map((row) => (
          <div key={row.name} className="flex items-baseline justify-between gap-3">
            <dt className="truncate text-sm text-muted-foreground">{row.name}</dt>
            <dd className="text-sm font-medium" data-numeric="">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

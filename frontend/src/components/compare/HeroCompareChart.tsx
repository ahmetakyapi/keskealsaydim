import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useChartPalette } from '@/hooks/useChartPalette';
import { axisDefaults, downsample } from '@/lib/chart';
import { cn, formatCompact, formatCurrency, formatDate, formatPercent } from '@/lib/utils';
import type { CompareSeriesPoint } from '@/types';

type ViewMode = 'value' | 'return';

interface HeroCompareChartProps {
  series: CompareSeriesPoint[];
  symbolA: string;
  symbolB: string;
  /** Starting capital, drawn as the break-even reference line. */
  amount: number;
  /** Wrapper class for the plot area; use `.hero-chart` for the fluid height. */
  chartClassName?: string;
  className?: string;
}

/**
 * The landing page's centrepiece chart.
 *
 * Two views over the same data: absolute lira value, or percentage return
 * rebased to the start. The rebased view is what makes two instruments with
 * very different price levels comparable — and unlike the old landing chart,
 * the axis and the tooltip agree, because both read the same formatter.
 */
export function HeroCompareChart({
  series,
  symbolA,
  symbolB,
  amount,
  chartClassName = 'h-[300px]',
  className,
}: HeroCompareChartProps) {
  const palette = useChartPalette();
  const [mode, setMode] = useState<ViewMode>('value');

  const data = useMemo(() => {
    if (series.length === 0) return [];

    const baseA = series[0].valueA || 1;
    const baseB = series[0].valueB || 1;

    return downsample(
      series.map((point) => ({
        date: point.date,
        a: mode === 'value' ? point.valueA : (point.valueA / baseA - 1) * 100,
        b: mode === 'value' ? point.valueB : (point.valueB / baseB - 1) * 100,
      })),
      280
    );
  }, [series, mode]);

  // One formatter for the axis, the tooltip and the reference line.
  const formatValue = (value: number) =>
    mode === 'value' ? formatCurrency(value) : formatPercent(value);
  const formatTick = (value: number) =>
    mode === 'value' ? `₺${formatCompact(value)}` : formatPercent(value, 0);

  if (data.length < 2) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-sm text-muted-foreground',
          chartClassName,
          className
        )}
      >
        Grafik için yeterli veri yok.
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: palette.series[0] }}
              aria-hidden="true"
            />
            <span className="font-medium">{symbolA}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: palette.series[1] }}
              aria-hidden="true"
            />
            <span className="font-medium">{symbolB}</span>
          </span>
        </div>

        <div
          className="flex rounded-lg border border-border p-0.5"
          role="group"
          aria-label="Grafik görünümü"
        >
          <Button
            variant={mode === 'value' ? 'subtle' : 'ghost'}
            size="sm"
            className="h-7 px-2.5 text-xs"
            aria-pressed={mode === 'value'}
            onClick={() => setMode('value')}
          >
            ₺ Değer
          </Button>
          <Button
            variant={mode === 'return' ? 'subtle' : 'ghost'}
            size="sm"
            className="h-7 px-2.5 text-xs"
            aria-pressed={mode === 'return'}
            onClick={() => setMode('return')}
          >
            % Getiri
          </Button>
        </div>
      </div>

      <div className={chartClassName}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="hero-fill-a" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.series[0]} stopOpacity={0.26} />
                <stop offset="100%" stopColor={palette.series[0]} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="hero-fill-b" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.series[1]} stopOpacity={0.26} />
                <stop offset="100%" stopColor={palette.series[1]} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              {...axisDefaults(palette)}
              minTickGap={56}
              tickFormatter={(value: string) => formatDate(value).slice(3)}
            />
            <YAxis {...axisDefaults(palette)} width={62} tickFormatter={formatTick} />

            {/* Break-even: the capital in value mode, zero return in the other. */}
            <ReferenceLine
              y={mode === 'value' ? amount : 0}
              stroke={palette.muted}
              strokeDasharray="4 4"
              strokeOpacity={0.55}
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
              formatter={(value: number, key) => [
                formatValue(value),
                key === 'a' ? symbolA : symbolB,
              ]}
            />

            <Area
              type="monotone"
              dataKey="a"
              stroke={palette.series[0]}
              strokeWidth={2}
              fill="url(#hero-fill-a)"
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="b"
              stroke={palette.series[1]}
              strokeWidth={2}
              fill="url(#hero-fill-b)"
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

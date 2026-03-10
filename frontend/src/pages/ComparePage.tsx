import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  CalendarRange,
  Copy,
  GitCompare,
  History,
  Link2,
  Search,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { GlassCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { compareService } from '@/services/compareService';
import { stockService } from '@/services/stockService';
import { useAuthStore } from '@/stores/authStore';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn, formatCurrency, formatPercent, getChangeColor } from '@/lib/utils';
import type { CompareResponse, SavedScenario, StockPrice, StockSearchResult } from '@/types';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChartPoint {
  date: string;
  normalizedA: number;
  normalizedB: number;
}

type AmountType = 'MONEY' | 'QUANTITY';
type DatePreset = '1M' | '3M' | '6M' | '1Y' | 'YTD';

interface QuoteState {
  quote: StockPrice | null;
  loading: boolean;
  failed: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase().split(/\s+/).join('');
}

function displaySymbol(symbol: string): string {
  return symbol.replace('.IS', '');
}

function getDateByPreset(preset: DatePreset): string {
  const date = new Date();
  if (preset === 'YTD') return `${date.getFullYear()}-01-01`;
  const months: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
  date.setMonth(date.getMonth() - (months[preset] ?? 6));
  return date.toISOString().slice(0, 10);
}

function buildNormalizedChartData(
  dataA: { date: string; close: number }[],
  dataB: { date: string; close: number }[],
): ChartPoint[] {
  if (!dataA.length || !dataB.length) return [];
  const baseA = dataA[0].close;
  const baseB = dataB[0].close;
  if (!baseA || !baseB) return [];
  const mapB = new Map(dataB.map((p) => [p.date, p.close]));
  return dataA
    .filter((p) => mapB.has(p.date))
    .map((p) => ({
      date: p.date,
      normalizedA: Number.parseFloat(((p.close / baseA) * 100).toFixed(2)),
      normalizedB: Number.parseFloat(((mapB.get(p.date)! / baseB) * 100).toFixed(2)),
    }));
}

function scenarioLabel(scenario: Pick<SavedScenario, 'title' | 'symbolA' | 'symbolB'>): string {
  const title = scenario.title?.trim();
  if (title) return title;
  return `${displaySymbol(scenario.symbolA)} vs ${displaySymbol(scenario.symbolB)}`;
}

function scenarioToResponse(scenario: SavedScenario): CompareResponse {
  return {
    scenarioId: scenario.id,
    shareToken: scenario.shareToken,
    symbolA: scenario.symbolA,
    symbolAName: scenario.symbolAName,
    symbolB: scenario.symbolB,
    symbolBName: scenario.symbolBName,
    startDate: scenario.startDate,
    endDate: scenario.endDate ?? new Date().toISOString().slice(0, 10),
    amount: scenario.amount,
    amountType: scenario.amountType,
    title: scenario.title,
    result: scenario.result,
  };
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useLiveQuote(symbol: string): QuoteState {
  const normalized = normalizeSymbol(symbol);
  const [state, setState] = useState<QuoteState>({ quote: null, loading: false, failed: false });

  useEffect(() => {
    if (normalized.length < 2) {
      setState({ quote: null, loading: false, failed: false });
      return;
    }
    let active = true;
    setState((prev) => ({
      quote: prev.quote && normalizeSymbol(prev.quote.symbol) === normalized ? prev.quote : null,
      loading: true,
      failed: false,
    }));
    const timer = setTimeout(async () => {
      try {
        const quote = await stockService.getPrice(normalized);
        if (active) setState({ quote, loading: false, failed: false });
      } catch {
        if (active) setState({ quote: null, loading: false, failed: true });
      }
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [normalized]);

  return state;
}

function useSymbolSearch(query: string) {
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const normalized = normalizeSymbol(query);

  useEffect(() => {
    if (normalized.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const items = await stockService.search(normalized);
        if (active) setResults(items.slice(0, 7));
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [normalized]);

  return { results, loading };
}

// ── Stock Picker ───────────────────────────────────────────────────────────────

// ── StockPicker sub-components ────────────────────────────────────────────────

function QuoteDisplay({ quote }: Readonly<{ quote: QuoteState }>) {
  if (quote.loading) {
    return (
      <div className="space-y-1.5">
        <div className="w-16 h-5 rounded-lg bg-white/8 animate-pulse" />
        <div className="w-10 h-3 rounded-lg bg-white/5 animate-pulse ml-auto" />
      </div>
    );
  }
  if (!quote.quote) return <p className="text-xs text-white/25">–</p>;
  const isUp = quote.quote.changePercent >= 0;
  return (
    <>
      <p className="font-bold text-white text-lg number-ticker">
        {quote.quote.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
      </p>
      <div className={cn('text-xs font-semibold flex items-center justify-end gap-0.5 mt-0.5', getChangeColor(quote.quote.changePercent))}>
        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {formatPercent(quote.quote.changePercent)}
      </div>
    </>
  );
}

function SearchDropdown({ open, query, results, loading, onSelect }: Readonly<{
  open: boolean;
  query: string;
  results: StockSearchResult[];
  loading: boolean;
  onSelect: (item: StockSearchResult) => void;
}>) {
  if (!open || (query.length < 2 && results.length === 0)) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="absolute top-12 left-0 right-0 rounded-xl border border-white/10 bg-surface/98 backdrop-blur-2xl shadow-2xl z-50 overflow-hidden"
      >
        {loading && (
          <div className="px-4 py-3 text-sm text-white/40 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-white/20 border-t-primary animate-spin" />
            Aranıyor...
          </div>
        )}
        {!loading && results.length === 0 && (
          <div className="px-4 py-3 text-sm text-white/30">
            {query.length >= 2 ? 'Sonuc bulunamadi' : 'Aramak icin yazin'}
          </div>
        )}
        {!loading && results.length > 0 && (
          <div className="py-1 max-h-64 overflow-y-auto">
            {results.map((item) => (
              <button
                key={item.symbol}
                type="button"
                onClick={() => onSelect(item)}
                className="w-full px-4 py-2.5 text-left hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{displaySymbol(item.symbol)}</p>
                  <p className="text-xs text-white/35 truncate">{item.name}</p>
                </div>
                <span className="text-[10px] text-white/25 shrink-0 font-mono">{item.exchange}</span>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

interface StockPickerProps {
  readonly label: string;
  readonly side: 'A' | 'B';
  readonly value: string;
  readonly onChange: (val: string) => void;
  readonly quote: QuoteState;
}

function StockPicker({ label, side, value, onChange, quote }: StockPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { results, loading: searchLoading } = useSymbolSearch(query);
  const ref = useRef<HTMLDivElement>(null);

  const isA = side === 'A';
  const badgeCls = isA
    ? 'bg-primary/15 text-primary border-primary/25'
    : 'bg-secondary/15 text-secondary border-secondary/25';
  const cardHoverCls = isA
    ? 'border-primary/15 hover:border-primary/35'
    : 'border-secondary/15 hover:border-secondary/35';
  const dotCls = isA ? 'bg-primary' : 'bg-secondary';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item: StockSearchResult) => {
    onChange(item.symbol);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="flex-1 min-w-0" ref={ref}>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold', badgeCls)}>
          {side}
        </span>
        <span className="text-sm font-semibold text-white/65">{label}</span>
      </div>

      {value && !open ? (
        <button
          type="button"
          onClick={() => {
            setQuery(displaySymbol(value));
            setOpen(true);
          }}
          className={cn(
            'w-full p-4 rounded-xl border bg-white/[0.03] hover:bg-white/[0.07] transition-all text-left group',
            cardHoverCls,
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dotCls)} />
                <span className="font-black text-white text-xl tracking-tight">{displaySymbol(value)}</span>
              </div>
              <p className="text-xs text-white/35 truncate pl-4">
                {quote.quote?.name ?? (quote.loading ? 'Yukleniyor...' : ' ')}
              </p>
            </div>
            <div className="text-right shrink-0">
              <QuoteDisplay quote={quote} />
            </div>
          </div>
          <p className="text-[10px] text-white/20 mt-3 group-hover:text-white/40 transition-colors">
            Degistirmek icin tikla
          </p>
        </button>
      ) : (
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value.toUpperCase());
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={`${label} hisse kodu...`}
            icon={<Search className="w-4 h-4" />}
            className="bg-white/[0.04] focus:bg-white/[0.07] transition-colors"
            autoFocus={!value}
          />

          <SearchDropdown
            open={open}
            query={query}
            results={results}
            loading={searchLoading}
            onSelect={handleSelect}
          />
        </div>
      )}
    </div>
  );
}

// ── Chart Tooltip ─────────────────────────────────────────────────────────────

interface ChartTooltipProps {
  readonly active?: boolean;
  readonly payload?: { dataKey: string; value: number }[];
  readonly label?: string;
  readonly symbolA: string;
  readonly symbolB: string;
}

function ChartTooltip({ active, payload, label, symbolA, symbolB }: ChartTooltipProps) {
  if (!active || !payload?.length || !label) return null;
  const a = payload.find((p) => p.dataKey === 'normalizedA');
  const b = payload.find((p) => p.dataKey === 'normalizedB');

  return (
    <div className="bg-surface/95 border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-xl min-w-[148px]">
      <p className="text-[11px] text-white/40 mb-2">
        {new Date(label).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
      </p>
      {a && (
        <p className="text-sm font-semibold text-primary mb-1">
          {displaySymbol(symbolA)}: {a.value > 100 ? '+' : ''}{(a.value - 100).toFixed(2)}%
        </p>
      )}
      {b && (
        <p className="text-sm font-semibold text-secondary">
          {displaySymbol(symbolB)}: {b.value > 100 ? '+' : ''}{(b.value - 100).toFixed(2)}%
        </p>
      )}
    </div>
  );
}

// ── Metric Row ────────────────────────────────────────────────────────────────

function MetricRow({ label, value, color }: Readonly<{ label: string; value: string; color?: string }>) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-white/45">{label}</span>
      <span className={cn('font-semibold text-white tabular-nums', color)}>{value}</span>
    </div>
  );
}

// ── Compare Chart ─────────────────────────────────────────────────────────────

function CompareChart({ chartData, chartLoading, symbolA, symbolB }: Readonly<{
  chartData: ChartPoint[];
  chartLoading: boolean;
  symbolA: string;
  symbolB: string;
}>) {
  if (chartLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-white/30 text-xs">Grafik yukleniyor...</p>
        </div>
      </div>
    );
  }
  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-white/25 text-sm">
        Grafik verisi yuklenemedi
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={288}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => new Date(v).toLocaleDateString('tr-TR', { month: 'short', day: '2-digit' })}
          tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
        <Tooltip content={<ChartTooltip symbolA={symbolA} symbolB={symbolB} />} />
        <Area type="monotone" dataKey="normalizedA" stroke="#10b981" strokeWidth={2.5} fill="url(#gradA)" dot={false} activeDot={{ r: 4, fill: '#10b981', stroke: 'none' }} />
        <Area type="monotone" dataKey="normalizedB" stroke="#38bdf8" strokeWidth={2.5} fill="url(#gradB)" dot={false} activeDot={{ r: 4, fill: '#38bdf8', stroke: 'none' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Compare Results sub-components ───────────────────────────────────────────

function WinnerBadge() {
  return (
    <span className="ml-auto text-[10px] font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
      Kazanan
    </span>
  );
}

function WinnerBanner({ missed, winnerSymbol, loserSymbol, diff }: Readonly<{
  missed: boolean;
  winnerSymbol: string;
  loserSymbol: string;
  diff: CompareResponse['result']['difference'];
}>) {
  const signCls = missed ? 'text-danger' : 'text-success';
  const ppSign = diff.percentagePoints >= 0 ? '+' : '';
  const tlSign = diff.absoluteTL >= 0 ? '+' : '–';
  return (
    <GlassCard className={cn('p-5 relative overflow-hidden', missed ? 'border-danger/20' : 'border-success/20')}>
      <div className={cn('absolute inset-0 pointer-events-none', missed
        ? 'bg-[radial-gradient(ellipse_at_0%_50%,rgba(255,71,87,0.14),transparent_55%)]'
        : 'bg-[radial-gradient(ellipse_at_0%_50%,rgba(0,200,150,0.14),transparent_55%)]'
      )} />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center border', missed ? 'bg-danger/15 border-danger/20' : 'bg-success/15 border-success/20')}>
            <Trophy className={cn('w-6 h-6', signCls)} />
          </div>
          <div>
            <p className="text-[11px] text-white/40 uppercase tracking-widest mb-0.5">{missed ? 'Kacirildi' : 'Kazanan'}</p>
            <p className="text-2xl font-black text-white tracking-tight leading-none">{displaySymbol(winnerSymbol)}</p>
            <p className="text-sm text-white/35 mt-1">vs {displaySymbol(loserSymbol)}</p>
          </div>
        </div>
        <div className="sm:text-right pl-16 sm:pl-0">
          <p className={cn('text-3xl font-black tabular-nums', signCls)}>{ppSign}{diff.percentagePoints.toFixed(1)}pp</p>
          {Math.abs(diff.absoluteTL) > 0 && (
            <p className="text-sm text-white/40 mt-0.5">{tlSign}{formatCurrency(Math.abs(diff.absoluteTL))} fark</p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function SymbolMetricsCard({ symbol, dotColor, isWinner, data }: Readonly<{
  symbol: string;
  dotColor: 'primary' | 'secondary';
  isWinner: boolean;
  data: CompareResponse['result']['symbolA'];
}>) {
  const profitSign = data.profitPercent >= 0 ? '+' : '';
  const karSign = data.profit >= 0 ? '+' : '';
  return (
    <GlassCard className={cn('p-5', isWinner && 'border-success/20')}>
      <div className="flex items-center gap-2 mb-4">
        <span className={cn('w-2.5 h-2.5 rounded-full', dotColor === 'primary' ? 'bg-primary' : 'bg-secondary')} />
        <p className="font-black text-white tracking-tight">{displaySymbol(symbol)}</p>
        {isWinner && <WinnerBadge />}
      </div>
      <div className="divide-y divide-white/[0.05]">
        <MetricRow label="Getiri" value={`${profitSign}${data.profitPercent.toFixed(2)}%`} color={getChangeColor(data.profitPercent)} />
        <MetricRow label="Son Deger" value={formatCurrency(data.endValue)} />
        <MetricRow label="Kar/Zarar" value={`${karSign}${formatCurrency(data.profit)}`} color={getChangeColor(data.profit)} />
      </div>
    </GlassCard>
  );
}

// ── Compare Results ───────────────────────────────────────────────────────────

function CompareResults({ result, chartData, chartLoading, symbolA, symbolB }: Readonly<{
  result: CompareResponse;
  chartData: ChartPoint[];
  chartLoading: boolean;
  symbolA: string;
  symbolB: string;
}>) {
  const diff = result.result.difference;
  const missed = diff.missedOpportunity;
  const winnerSide = diff.winnerSymbol;
  const winnerSymbol = winnerSide === 'A' ? symbolA : symbolB;
  const loserSymbol = winnerSide === 'A' ? symbolB : symbolA;
  const ppSign = diff.percentagePoints >= 0 ? '+' : '';

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      className="space-y-4"
    >
      <WinnerBanner missed={missed} winnerSymbol={winnerSymbol} loserSymbol={loserSymbol} diff={diff} />

      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <p className="text-sm font-semibold text-white">Normalize Performans</p>
          <div className="flex items-center gap-5 text-xs">
            <span className="flex items-center gap-2 text-primary font-semibold">
              <span className="w-7 h-[2px] bg-primary rounded-full inline-block" />
              {displaySymbol(symbolA)}
            </span>
            <span className="flex items-center gap-2 text-secondary font-semibold">
              <span className="w-7 h-[2px] bg-secondary rounded-full inline-block" />
              {displaySymbol(symbolB)}
            </span>
          </div>
        </div>
        <CompareChart chartData={chartData} chartLoading={chartLoading} symbolA={symbolA} symbolB={symbolB} />
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SymbolMetricsCard symbol={symbolA} dotColor="primary" isWinner={winnerSide === 'A'} data={result.result.symbolA} />
        <SymbolMetricsCard symbol={symbolB} dotColor="secondary" isWinner={winnerSide === 'B'} data={result.result.symbolB} />

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
            <p className="font-black text-white tracking-tight">Fark</p>
          </div>
          <div className="divide-y divide-white/[0.05]">
            <MetricRow label="Puan Farki" value={`${ppSign}${diff.percentagePoints.toFixed(1)}pp`} color={diff.percentagePoints >= 0 ? 'text-success' : 'text-danger'} />
            <MetricRow label="Tutar Farki" value={formatCurrency(Math.abs(diff.absoluteTL))} color={diff.absoluteTL >= 0 ? 'text-success' : 'text-danger'} />
            <MetricRow label="Kacirildi mi?" value={missed ? 'Evet' : 'Hayir'} color={missed ? 'text-danger' : 'text-success'} />
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}

function SavedScenarioRail({
  items,
  loading,
  activeShareToken,
  onSelect,
}: Readonly<{
  items: SavedScenario[];
  loading: boolean;
  activeShareToken?: string | null;
  onSelect: (scenario: SavedScenario) => void;
}>) {
  return (
    <GlassCard className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
            <History className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Kaydedilen Senaryolar</p>
            <p className="text-xs text-white/35">En son karsilastirmalariniz tek dokunusla geri gelir.</p>
          </div>
        </div>
        <span className="text-[11px] uppercase tracking-[0.18em] text-white/25">Son 6</span>
      </div>

      {loading ? (
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-3 min-w-max">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={`scenario-skeleton-${index}`}
                className="w-[252px] max-w-[78vw] rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3 skeleton-shimmer"
              >
                <div className="w-28 h-4 rounded-lg skeleton-shimmer" />
                <div className="w-40 h-3 rounded-lg skeleton-shimmer" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-14 rounded-xl skeleton-shimmer" />
                  <div className="h-14 rounded-xl skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-white/35">
          Ilk karsilastirmadan sonra gecmisiniz burada gorunecek. Kaydedilen senaryolar mobilde de hizli ulasilir olacak.
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-3 min-w-max pb-1">
            {items.map((scenario) => {
              const winner = scenario.result.difference.winnerSymbol === 'A' ? scenario.symbolA : scenario.symbolB;
              const active = Boolean(activeShareToken && scenario.shareToken === activeShareToken);

              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => onSelect(scenario)}
                  className={cn(
                    'w-[252px] max-w-[78vw] rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-white/[0.06]',
                    active
                      ? 'border-primary/30 bg-primary/[0.08] shadow-[0_18px_48px_-30px_rgba(16,185,129,0.55)]'
                      : 'border-white/10 bg-white/[0.03]',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{scenarioLabel(scenario)}</p>
                      <p className="mt-1 text-xs text-white/35">
                        {new Date(scenario.startDate).toLocaleDateString('tr-TR')} -{' '}
                        {new Date(scenario.endDate ?? scenario.startDate).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    {scenario.shareToken && (
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/35">
                        <Link2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/8 bg-black/10 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Kazanan</p>
                      <p className="mt-1 text-sm font-bold text-white">{displaySymbol(winner)}</p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-black/10 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Fark</p>
                      <p className={cn('mt-1 text-sm font-bold', getChangeColor(scenario.result.difference.percentagePoints))}>
                        {scenario.result.difference.percentagePoints >= 0 ? '+' : ''}
                        {scenario.result.difference.percentagePoints.toFixed(2)}pp
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-white/35">
                    <span>{scenario.amount.toLocaleString('tr-TR')} {scenario.amountType === 'MONEY' ? 'TL' : 'adet'}</span>
                    <span>{active ? 'Acik' : 'Yukle'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const shareTokenParam = searchParams.get('share')?.trim() ?? '';

  const [symbolA, setSymbolA] = useState(() => {
    const param = searchParams.get('symbol');
    return param ? normalizeSymbol(param) : 'THYAO.IS';
  });
  const [symbolB, setSymbolB] = useState('GARAN.IS');
  const [startDate, setStartDate] = useState(getDateByPreset('1Y'));
  const [selectedPreset, setSelectedPreset] = useState<DatePreset | null>('1Y');
  const [amount, setAmount] = useState('10000');
  const [amountType, setAmountType] = useState<AmountType>('MONEY');

  const [result, setResult] = useState<CompareResponse | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [comparing, setComparing] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sharedLoading, setSharedLoading] = useState(false);

  const quoteA = useLiveQuote(symbolA);
  const quoteB = useLiveQuote(symbolB);

  const applyResponse = useCallback((response: CompareResponse) => {
    setSymbolA(response.symbolA);
    setSymbolB(response.symbolB);
    setStartDate(response.startDate);
    setSelectedPreset(null);
    setAmount(response.amount.toString());
    setAmountType(response.amountType === 'QUANTITY' ? 'QUANTITY' : 'MONEY');
    setResult(response);
  }, []);

  const loadChart = useCallback(async (symA: string, symB: string, from: string, to?: string) => {
    const targetEnd = to || new Date().toISOString().slice(0, 10);
    setChartLoading(true);
    try {
      const [histA, histB] = await Promise.allSettled([
        stockService.getHistory(symA, from, targetEnd),
        stockService.getHistory(symB, from, targetEnd),
      ]);
      if (histA.status === 'fulfilled' && histB.status === 'fulfilled') {
        const toClose = (data: { date: string; close: number; adjustedClose: number }[]) =>
          data.map((point) => ({ date: point.date, close: point.adjustedClose || point.close }));
        setChartData(buildNormalizedChartData(toClose(histA.value.data), toClose(histB.value.data)));
      } else {
        setChartData([]);
      }
    } finally {
      setChartLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedScenarios([]);
      return;
    }

    setHistoryLoading(true);
    try {
      const page = await compareService.getHistory(0, 6);
      setSavedScenarios(page.content);
    } catch {
      setSavedScenarios([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!shareTokenParam) return;

    let cancelled = false;
    setSharedLoading(true);

    void (async () => {
      try {
        const shared = await compareService.getShared(shareTokenParam);
        if (cancelled) return;
        applyResponse(shared);
        await loadChart(shared.symbolA, shared.symbolB, shared.startDate, shared.endDate);
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err, 'Paylasilan senaryo yuklenemedi'));
        }
      } finally {
        if (!cancelled) {
          setSharedLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyResponse, loadChart, shareTokenParam]);

  const handlePreset = (preset: DatePreset) => {
    setSelectedPreset(preset);
    setStartDate(getDateByPreset(preset));
  };

  const handleSwap = () => {
    setSymbolA(symbolB);
    setSymbolB(symbolA);
  };

  const handleCompare = async () => {
    const symA = normalizeSymbol(symbolA);
    const symB = normalizeSymbol(symbolB);
    const numAmount = Number.parseFloat(amount);

    if (!symA || !symB) { toast.error('Iki hisse secmelisiniz'); return; }
    if (symA === symB) { toast.error('Farkli iki hisse secin'); return; }
    if (!numAmount || numAmount <= 0) { toast.error('Gecerli bir tutar girin'); return; }

    setComparing(true);
    setResult(null);
    setChartData([]);
    if (shareTokenParam) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('share');
      setSearchParams(nextParams, { replace: true });
    }

    try {
      const res = await compareService.compare({
        symbolA: symA,
        symbolB: symB,
        startDate,
        amount: numAmount,
        amountType,
        saveScenario: isAuthenticated,
      });
      applyResponse(res);
      await loadChart(res.symbolA, res.symbolB, res.startDate, res.endDate);
      if (isAuthenticated) {
        await loadHistory();
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Karsilastirma basarisiz oldu'));
    } finally {
      setComparing(false);
    }
  };

  const handleCopyShareLink = useCallback(async () => {
    if (!result?.shareToken) return;

    const shareURL = `${window.location.origin}/compare?share=${encodeURIComponent(result.shareToken)}`;
    try {
      await navigator.clipboard.writeText(shareURL);
      toast.success('Paylasim baglantisi kopyalandi');
    } catch {
      toast.error('Baglanti kopyalanamadi');
    }
  }, [result?.shareToken]);

  const handleScenarioSelect = useCallback(async (scenario: SavedScenario) => {
    const response = scenarioToResponse(scenario);
    applyResponse(response);
    await loadChart(response.symbolA, response.symbolB, response.startDate, response.endDate);

    const nextParams = new URLSearchParams(searchParams);
    if (scenario.shareToken) {
      nextParams.set('share', scenario.shareToken);
    } else {
      nextParams.delete('share');
    }
    setSearchParams(nextParams, { replace: true });
  }, [applyResponse, loadChart, searchParams, setSearchParams]);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
          <GitCompare className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white leading-tight">Keske Alsaydim?</h1>
          <p className="text-white/45 text-sm">Iki hisseyi karsilastir, hangisi daha iyi getiri sagladi gor</p>
        </div>
      </motion.div>

      {/* Input card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
      >
        <GlassCard className="p-6 space-y-6">
          {/* Stock pickers + swap */}
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <StockPicker label="Hisse A" side="A" value={symbolA} onChange={setSymbolA} quote={quoteA} />

            <div className="flex justify-center md:mt-11 flex-shrink-0">
              <button
                type="button"
                onClick={handleSwap}
                title="Hisseleri degistir"
                className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] hover:border-primary/20 transition-all group"
              >
                <ArrowRightLeft className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
              </button>
            </div>

            <StockPicker label="Hisse B" side="B" value={symbolB} onChange={setSymbolB} quote={quoteB} />
          </div>

          {/* Gradient divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* Date + Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-white/60">
                <CalendarRange className="w-4 h-4 text-primary" />
                Baslangic Tarihi
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['1M', '3M', '6M', '1Y', 'YTD'] as DatePreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePreset(preset)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      selectedPreset === preset
                        ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_8px_-2px_rgba(16,185,129,0.4)]'
                        : 'bg-white/[0.04] text-white/40 border border-white/8 hover:border-white/20 hover:text-white/65',
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSelectedPreset(null);
                }}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/35 focus:bg-white/[0.07] transition-all"
              />
            </div>

            {/* Amount */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-white/60">
                <TrendingUp className="w-4 h-4 text-secondary" />
                Yatirim Tutari
              </label>
              <div className="flex gap-2">
                {(['MONEY', 'QUANTITY'] as AmountType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAmountType(type)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border',
                      amountType === type
                        ? 'bg-secondary/15 text-secondary border-secondary/25 shadow-[0_0_8px_-2px_rgba(56,189,248,0.3)]'
                        : 'bg-white/[0.04] text-white/35 border-white/8 hover:border-white/20 hover:text-white/60',
                    )}
                  >
                    {type === 'MONEY' ? '₺ Tutar' : '# Adet'}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm select-none">
                  {amountType === 'MONEY' ? '₺' : '#'}
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10000"
                  min="1"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-secondary/35 focus:bg-white/[0.07] transition-all"
                />
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button
            variant="gradient"
            size="lg"
            className="w-full text-[15px] font-bold tracking-wide shadow-[0_4px_24px_-6px_rgba(16,185,129,0.45)]"
            loading={comparing}
            onClick={handleCompare}
            disabled={!symbolA || !symbolB}
          >
            {!comparing && <Sparkles className="w-5 h-5 mr-2" />}
            Karsilastir
          </Button>

          <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                {isAuthenticated ? 'Senaryolariniz otomatik kaydedilir' : 'Senaryolari kaydetmek icin giris yapin'}
              </p>
              <p className="mt-1 text-xs text-white/35">
                {isAuthenticated
                  ? 'Karsilastirma sonucu gecmisinize eklenir ve tek dokunusla tekrar yuklenebilir.'
                  : 'Giris yaptiginizda paylasilabilir karsilastirma linkleri ve gecmis senaryolar acilir.'}
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {(isAuthenticated || shareTokenParam) && (
        <SavedScenarioRail
          items={savedScenarios}
          loading={historyLoading}
          activeShareToken={result?.shareToken ?? shareTokenParam}
          onSelect={(scenario) => {
            void handleScenarioSelect(scenario);
          }}
        />
      )}

      {sharedLoading && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-3 text-sm text-white/55">
            <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            Paylasilan senaryo yukleniyor...
          </div>
        </GlassCard>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <div className="space-y-4">
            {result.shareToken && (
              <GlassCard className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-primary" />
                      Paylasilabilir Senaryo Hazir
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      Bu karsilastirma baglanti ile paylasilabilir ve gecmisten tekrar acilabilir.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="gradient"
                    size="sm"
                    className="shrink-0"
                    onClick={handleCopyShareLink}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Baglantiyi Kopyala
                  </Button>
                </div>
              </GlassCard>
            )}

            <CompareResults
              result={result}
              chartData={chartData}
              chartLoading={chartLoading}
              symbolA={symbolA}
              symbolB={symbolB}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Globe,
  DollarSign,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock,
  WifiOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShimmerCard, ShimmerRow } from '@/components/ui/skeleton';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import CountUp from 'react-countup';
import { marketService } from '@/services/marketService';
import type { MarketOverview, MarketQuote } from '@/types';

// ── Animation variants ────────────────────────────────────────────────────────

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

// ── Constants ─────────────────────────────────────────────────────────────────

interface KeyMetricConfig {
  symbol: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const KEY_METRICS: KeyMetricConfig[] = [
  { symbol: 'XU100.IS',  label: 'BIST 100', icon: BarChart3,   color: 'primary'  },
  { symbol: 'USDTRY=X',  label: 'USD/TRY',  icon: DollarSign,  color: 'danger'   },
  { symbol: 'EURTRY=X',  label: 'EUR/TRY',  icon: Globe,       color: 'success'  },
  { symbol: 'GBPTRY=X',  label: 'GBP/TRY',  icon: Activity,    color: 'secondary'},
  { symbol: 'GC=F',      label: 'Altin',    icon: Coins,       color: 'yellow'   },
];

const KEY_METRIC_SYMBOLS = new Set(KEY_METRICS.map((m) => m.symbol));

const COLOR_CLASSES: Record<string, string> = {
  primary:   'from-primary/20 bg-primary/10',
  secondary: 'from-secondary/20 bg-secondary/10',
  success:   'from-success/20 bg-success/10',
  danger:    'from-danger/20 bg-danger/10',
  yellow:    'from-yellow-500/20 bg-yellow-500/10',
};

const ICON_COLOR_CLASSES: Record<string, string> = {
  primary:   'text-primary',
  secondary: 'text-secondary',
  success:   'text-success',
  danger:    'text-danger',
  yellow:    'text-yellow-500',
};

const GLOW_CLASSES: Record<string, string> = {
  primary:   'card-glow-green',
  secondary: 'card-glow-blue',
  success:   'card-glow-green',
  danger:    'card-glow-red',
  yellow:    'card-glow-gold',
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

function formatLastUpdated(lastUpdated: Date | null): string {
  if (!lastUpdated) return 'Simdi';
  const diffSec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
  if (diffSec < 60) return 'Az once';
  return `${Math.floor(diffSec / 60)} dk once`;
}

function isBistStock(quote: MarketQuote): boolean {
  return quote.symbol.endsWith('.IS') && !KEY_METRIC_SYMBOLS.has(quote.symbol);
}

// ── Live Indicator ────────────────────────────────────────────────────────────

function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-success/80">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-success/60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      Canli
    </span>
  );
}

// ── Premium Loading ──────────────────────────────────────────────────────────

function MarketLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metric cards shimmer */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <ShimmerCard key={`mk-card-${i}`} className="!p-4" />
        ))}
      </div>

      {/* Main grid shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={`mk-list-${i}`} className="skeleton-shimmer rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
                <div className="w-32 h-5 rounded-lg skeleton-shimmer" />
              </div>
              {Array.from({ length: 5 }, (_, j) => (
                <ShimmerRow key={`mk-row-${i}-${j}`} />
              ))}
            </div>
          ))}
        </div>
        <div className="skeleton-shimmer rounded-2xl p-6 space-y-4">
          <div className="w-28 h-5 rounded-lg skeleton-shimmer" />
          <div className="w-full h-4 rounded-full skeleton-shimmer" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={`mk-breadth-${i}`} className="skeleton-shimmer rounded-xl p-4 h-16" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MetricCardProps {
  config: KeyMetricConfig;
  quote: MarketQuote | undefined;
  index: number;
}
function MetricCard({ config, quote, index }: Readonly<MetricCardProps>) {
  const Icon = config.icon;
  const bgClass   = COLOR_CLASSES[config.color]?.split(' ')[1] ?? '';
  const fromClass = COLOR_CLASSES[config.color]?.split(' ')[0] ?? '';
  const iconColor = ICON_COLOR_CLASSES[config.color] ?? 'text-white';
  const glowClass = GLOW_CLASSES[config.color] ?? '';
  if (!quote) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      >
        <GlassCard className="p-4 relative overflow-hidden border border-white/[0.08] bg-white/[0.03]">
          <div className="flex items-center justify-between mb-3">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center ring-1 ring-white/10', bgClass)}>
              <Icon className={cn('w-4 h-4', iconColor)} />
            </div>
            <Badge variant="secondary" size="sm" className="bg-white/[0.05] text-white/55 border-white/10">
              Veri yok
            </Badge>
          </div>
          <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1">{config.label}</p>
          <p className="text-lg font-bold text-white/70">Bekleniyor</p>
          <p className="text-xs text-white/30 mt-1">Bu gosterge icin guncel quote alinamadi.</p>
        </GlassCard>
      </motion.div>
    );
  }

  const change    = quote?.changePercent ?? 0;
  const price     = quote?.price ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassCard className={cn('p-4 hover:scale-[1.03] transition-all duration-300 cursor-pointer relative overflow-hidden group', glowClass)}>
        <div className={cn('absolute inset-0 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500', fromClass)} />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center ring-1 ring-white/10', bgClass)}>
              <Icon className={cn('w-4 h-4', iconColor)} />
            </div>
            <Badge variant={change >= 0 ? 'success' : 'danger'} size="sm">
              {change >= 0 ? '+' : ''}{formatPercent(change)}
            </Badge>
          </div>
          <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1">{config.label}</p>
          <p className="text-lg font-bold text-white number-ticker">
            <CountUp end={price} separator="." decimals={2} decimal="," duration={0.8} />
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

interface StockRowProps { quote: MarketQuote; index: number; variant: 'gainer' | 'loser' }
function StockRow({ quote, index, variant }: Readonly<StockRowProps>) {
  const isGainer   = variant === 'gainer';
  const rowBg      = isGainer ? 'bg-success/[0.03] hover:bg-success/[0.08]' : 'bg-danger/[0.03] hover:bg-danger/[0.08]';
  const iconBg     = isGainer ? 'bg-success/15 ring-1 ring-success/20' : 'bg-danger/15 ring-1 ring-danger/20';
  const changeCls  = isGainer ? 'text-success' : 'text-danger';
  const sign       = isGainer ? '+' : '';
  const animateX   = isGainer ? -20 : 20;
  const displaySym = quote.symbol.replace('.IS', '');

  return (
    <motion.div
      initial={{ opacity: 0, x: animateX }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex items-center justify-between p-3 rounded-xl transition-all duration-200 group cursor-pointer border border-transparent hover:border-white/[0.06]', rowBg)}
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300', iconBg)}>
          {isGainer
            ? <ArrowUpRight className="w-4 h-4 text-success" />
            : <ArrowDownRight className="w-4 h-4 text-danger" />
          }
        </div>
        <div>
          <p className="font-medium text-white text-sm">{displaySym}</p>
          <p className="text-[10px] text-white/35">{quote.name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-white text-sm number-ticker">{formatCurrency(quote.price)}</p>
        <p className={cn('text-xs font-semibold', changeCls)}>
          {sign}{formatPercent(quote.changePercent)}
        </p>
      </div>
    </motion.div>
  );
}

// ── Section: Key Metrics Grid ─────────────────────────────────────────────────

interface MetricsSectionProps { loading: boolean; quoteMap: Map<string, MarketQuote> }
function MetricsSection({ loading, quoteMap }: Readonly<MetricsSectionProps>) {
  if (loading) return null;

  return (
    <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {KEY_METRICS.map((cfg, i) => (
        <MetricCard key={cfg.symbol} config={cfg} quote={quoteMap.get(cfg.symbol)} index={i} />
      ))}
    </motion.div>
  );
}

// ── Section: Gainers ──────────────────────────────────────────────────────────

interface GainersSectionProps {
  loading: boolean;
  gainers: MarketQuote[];
  unavailable?: boolean;
}
function GainersSection({ loading, gainers, unavailable }: Readonly<GainersSectionProps>) {
  if (loading) return null;

  return (
    <motion.div variants={fadeInUp}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center ring-1 ring-success/20">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div>
            <CardTitle>En Cok Yukselenler</CardTitle>
            <p className="text-[10px] text-white/35 uppercase tracking-wider mt-1">BIST hisseleri</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {unavailable
            ? <p className="text-white/35 text-sm text-center py-4">Piyasa verisi alinamadi</p>
            : gainers.length === 0
            ? <p className="text-white/35 text-sm text-center py-4">Yukselen hisse bulunamadi</p>
            : gainers.map((q, i) => <StockRow key={q.symbol} quote={q} index={i} variant="gainer" />)
          }
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Section: Losers ───────────────────────────────────────────────────────────

interface LosersSectionProps {
  loading: boolean;
  losers: MarketQuote[];
  unavailable?: boolean;
}
function LosersSection({ loading, losers, unavailable }: Readonly<LosersSectionProps>) {
  if (loading) return null;

  return (
    <motion.div variants={fadeInUp}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-danger/15 flex items-center justify-center ring-1 ring-danger/20">
            <TrendingDown className="w-5 h-5 text-danger" />
          </div>
          <div>
            <CardTitle>En Cok Dusenler</CardTitle>
            <p className="text-[10px] text-white/35 uppercase tracking-wider mt-1">BIST hisseleri</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {unavailable
            ? <p className="text-white/35 text-sm text-center py-4">Piyasa verisi alinamadi</p>
            : losers.length === 0
            ? <p className="text-white/35 text-sm text-center py-4">Dusen hisse bulunamadi</p>
            : losers.map((q, i) => <StockRow key={q.symbol} quote={q} index={i} variant="loser" />)
          }
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Section: Market Breadth ───────────────────────────────────────────────────

interface BreadthSectionProps {
  loading: boolean;
  gainersCount: number;
  losersCount: number;
  unchangedCount: number;
  unavailable?: boolean;
}
function BreadthSection({
  loading,
  gainersCount,
  losersCount,
  unchangedCount,
  unavailable,
}: Readonly<BreadthSectionProps>) {
  if (loading) return null;

  const total = gainersCount + losersCount + unchangedCount || 1;
  const gainPct = (gainersCount / total) * 100;
  const lossPct = (losersCount / total) * 100;
  const unchangedPct = (unchangedCount / total) * 100;

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Piyasa Genisligi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {unavailable ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/35">
              Piyasa genisligi icin gerekli BIST verileri alinamadi.
            </div>
          ) : (
            <>
              <div className="flex h-4 rounded-full overflow-hidden bg-white/[0.04]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${gainPct}%` }}
                  transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-gradient-to-r from-success to-success/80"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${unchangedPct}%` }}
                  transition={{ duration: 1, delay: 0.4 }}
                  className="bg-white/20"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${lossPct}%` }}
                  transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-gradient-to-r from-danger/80 to-danger"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-success/[0.06] border border-success/10 card-glow-green">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowUpRight className="w-4 h-4 text-success" />
                    <span className="text-success font-bold text-lg">{gainersCount}</span>
                  </div>
                  <p className="text-[10px] text-white/35 uppercase tracking-wider">Yukselen</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-white/60 font-bold text-lg">{unchangedCount}</span>
                  <p className="text-[10px] text-white/35 uppercase tracking-wider">Degismeyen</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-danger/[0.06] border border-danger/10 card-glow-red">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowDownRight className="w-4 h-4 text-danger" />
                    <span className="text-danger font-bold text-lg">{losersCount}</span>
                  </div>
                  <p className="text-[10px] text-white/35 uppercase tracking-wider">Dusen</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface MarketSignalCardProps {
  loading: boolean;
  unavailable?: boolean;
  totalTracked: number;
  gainersCount: number;
  losersCount: number;
  unchangedCount: number;
  strongestGainer?: MarketQuote;
  strongestLoser?: MarketQuote;
}

function MarketSignalCard({
  loading,
  unavailable,
  totalTracked,
  gainersCount,
  losersCount,
  unchangedCount,
  strongestGainer,
  strongestLoser,
}: Readonly<MarketSignalCardProps>) {
  if (loading) return null;

  const tone = gainersCount > losersCount ? 'Alicili' : losersCount > gainersCount ? 'Saticili' : 'Dengeli';
  const toneColor = gainersCount > losersCount ? 'text-success' : losersCount > gainersCount ? 'text-danger' : 'text-secondary';
  const participation = totalTracked > 0 ? ((gainersCount + losersCount) / totalTracked) * 100 : 0;

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Piyasa Sinyali
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {unavailable ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/35">
              Piyasa sinyali hesaplanamadi. Veri geldiginizde baskin yon burada ozetlenecek.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Bugunun tonu</p>
                <p className={cn('mt-2 text-3xl font-bold tracking-tight', toneColor)}>{tone}</p>
                <p className="mt-1 text-sm text-white/40">{totalTracked} takipli BIST hissesi icinden hesaplandi</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Katilim</p>
                  <p className="mt-1 text-lg font-bold text-white">{participation.toFixed(0)}%</p>
                  <p className="text-[11px] text-white/35">Hareketli hisse orani</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Degismeyen</p>
                  <p className="mt-1 text-lg font-bold text-white">{unchangedCount}</p>
                  <p className="text-[11px] text-white/35">Yatay kalanlar</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="rounded-xl border border-success/10 bg-success/[0.05] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-success/80">En guclu yukselen</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {strongestGainer ? `${strongestGainer.symbol.replace('.IS', '')}  ${formatPercent(strongestGainer.changePercent)}` : 'Veri yok'}
                  </p>
                </div>
                <div className="rounded-xl border border-danger/10 bg-danger/[0.05] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-danger/80">En guclu dusen</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {strongestLoser ? `${strongestLoser.symbol.replace('.IS', '')}  ${formatPercent(strongestLoser.changePercent)}` : 'Veri yok'}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MarketPage() {
  const [market, setMarket] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [apiError, setApiError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [result] = await Promise.allSettled([marketService.getOverview()]);
    if (result.status === 'fulfilled') {
      setMarket(result.value);
      setApiError(false);
    } else {
      setApiError(true);
    }
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const quoteMap = new Map<string, MarketQuote>(
    market?.quotes?.map((q) => [q.symbol, q]) ?? []
  );

  const bistStocks = market?.quotes?.filter(isBistStock) ?? [];
  const allGainers = bistStocks
    .filter((q) => q.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent);
  const allLosers = bistStocks
    .filter((q) => q.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent);
  const unchanged = bistStocks.filter((q) => q.changePercent === 0);
  const gainers = allGainers.slice(0, 5);
  const losers = allLosers.slice(0, 5);
  const marketUnavailable = !market && apiError;

  return (
    <motion.div
      className="space-y-6 rounded-3xl border border-white/[0.06] bg-[linear-gradient(145deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))] p-3 md:p-4 shadow-[0_28px_90px_-62px_rgba(56,189,248,0.82)]"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <Globe className="w-7 h-7 text-primary" />
            Piyasa
          </h1>
          <p className="text-white/50 text-sm">Piyasa genel gorunumu ve onemli gostergeler</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            <LiveIndicator />
            <div className="flex items-center gap-2 text-white/35 text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatLastUpdated(lastUpdated)}</span>
            </div>
          </div>
          <Button variant="outline" className="border-white/15 text-white/80 hover:text-white hover:border-white/30 transition-all" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Yenile
          </Button>
        </div>
      </motion.div>

      {apiError && (
        <motion.div
          variants={fadeInUp}
          className={cn(
            'flex items-center gap-3 rounded-xl px-4 py-3 text-sm',
            marketUnavailable
              ? 'border border-danger/25 bg-danger/10 text-danger'
              : 'border border-yellow-500/25 bg-yellow-500/10 text-yellow-200',
          )}
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          <span className="flex-1">
            {marketUnavailable
              ? 'Piyasa verisi su an alinamiyor. Backend veya dis veri kaynagi erisimini kontrol edin.'
              : 'Piyasa yenilemesi basarisiz oldu. Son basarili veri gosteriliyor olabilir.'}
          </span>
          <button
            type="button"
            onClick={fetchData}
            className="underline underline-offset-2 text-xs font-semibold shrink-0 opacity-80 hover:opacity-100"
          >
            Tekrar dene
          </button>
        </motion.div>
      )}

      {loading ? (
        <MarketLoadingSkeleton />
      ) : (
        <>
          {/* Key Metrics Grid */}
          <MetricsSection loading={loading} quoteMap={quoteMap} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <GainersSection loading={loading} gainers={gainers} unavailable={marketUnavailable} />
              <LosersSection loading={loading} losers={losers} unavailable={marketUnavailable} />
            </div>

            <div className="space-y-6">
              <MarketSignalCard
                loading={loading}
                unavailable={marketUnavailable}
                totalTracked={bistStocks.length}
                gainersCount={allGainers.length}
                losersCount={allLosers.length}
                unchangedCount={unchanged.length}
                strongestGainer={allGainers[0]}
                strongestLoser={allLosers[0]}
              />
              <BreadthSection
                loading={loading}
                gainersCount={allGainers.length}
                losersCount={allLosers.length}
                unchangedCount={unchanged.length}
                unavailable={marketUnavailable}
              />
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

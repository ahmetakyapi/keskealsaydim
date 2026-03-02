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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import CountUp from 'react-countup';
import { marketService } from '@/services/marketService';
import type { MarketOverview, MarketQuote } from '@/types';

// ── Animation variants ────────────────────────────────────────────────────────

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
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
  { symbol: 'GC=F',      label: 'Altın',    icon: Coins,       color: 'yellow'   },
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

const SKELETON_METRIC_KEYS = ['sk-km-0', 'sk-km-1', 'sk-km-2', 'sk-km-3', 'sk-km-4'];
const SKELETON_STOCK_KEYS  = ['sk-s-0', 'sk-s-1', 'sk-s-2', 'sk-s-3', 'sk-s-4'];

// ── Pure helpers ──────────────────────────────────────────────────────────────

function formatLastUpdated(lastUpdated: Date | null): string {
  if (!lastUpdated) return 'Şimdi';
  const diffSec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
  if (diffSec < 60) return 'Az önce';
  return `${Math.floor(diffSec / 60)} dk önce`;
}

function isBistStock(quote: MarketQuote): boolean {
  return quote.symbol.endsWith('.IS') && !KEY_METRIC_SYMBOLS.has(quote.symbol);
}

// ── Skeleton primitives ───────────────────────────────────────────────────────

function SkeletonMetricCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/10" />
        <div className="w-14 h-5 rounded-full bg-white/10" />
      </div>
      <div className="w-16 h-3 rounded bg-white/10 mb-1" />
      <div className="w-24 h-6 rounded bg-white/10" />
    </div>
  );
}

function SkeletonStockRow() {
  return (
    <div className="animate-pulse flex items-center justify-between p-3 rounded-xl bg-white/5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/10" />
        <div className="space-y-2">
          <div className="w-14 h-3 rounded bg-white/10" />
          <div className="w-20 h-3 rounded bg-white/10" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <div className="w-18 h-3 rounded bg-white/10" />
        <div className="w-12 h-3 rounded bg-white/10" />
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
  const change    = quote?.changePercent ?? 0;
  const price     = quote?.price ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <GlassCard className="p-4 hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden group">
        <div className={cn('absolute inset-0 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity', fromClass)} />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bgClass)}>
              <Icon className={cn('w-4 h-4', iconColor)} />
            </div>
            <Badge variant={change >= 0 ? 'success' : 'danger'} size="sm">
              {change >= 0 ? '+' : ''}{formatPercent(change)}
            </Badge>
          </div>
          <p className="text-white/60 text-xs mb-1">{config.label}</p>
          <p className="text-lg font-bold text-white">
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
  const rowBg      = isGainer ? 'bg-success/5 hover:bg-success/10' : 'bg-danger/5 hover:bg-danger/10';
  const iconBg     = isGainer ? 'bg-success/20' : 'bg-danger/20';
  const changeCls  = isGainer ? 'text-success' : 'text-danger';
  const sign       = isGainer ? '+' : '';
  const animateX   = isGainer ? -20 : 20;

  // Strip .IS suffix for display
  const displaySymbol = quote.symbol.replace('.IS', '');

  return (
    <motion.div
      initial={{ opacity: 0, x: animateX }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn('flex items-center justify-between p-3 rounded-xl transition-all group cursor-pointer', rowBg)}
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform', iconBg)}>
          {isGainer
            ? <ArrowUpRight className="w-4 h-4 text-success" />
            : <ArrowDownRight className="w-4 h-4 text-danger" />
          }
        </div>
        <div>
          <p className="font-medium text-white text-sm">{displaySymbol}</p>
          <p className="text-xs text-white/40">{quote.name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-white text-sm">{formatCurrency(quote.price)}</p>
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
  if (loading) {
    return (
      <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {SKELETON_METRIC_KEYS.map((k) => <SkeletonMetricCard key={k} />)}
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {KEY_METRICS.map((cfg, i) => (
        <MetricCard key={cfg.symbol} config={cfg} quote={quoteMap.get(cfg.symbol)} index={i} />
      ))}
    </motion.div>
  );
}

// ── Section: Gainers ──────────────────────────────────────────────────────────

interface GainersSectionProps { loading: boolean; gainers: MarketQuote[] }
function GainersSection({ loading, gainers }: Readonly<GainersSectionProps>) {
  let content: React.ReactNode;

  if (loading) {
    content = SKELETON_STOCK_KEYS.map((k) => <SkeletonStockRow key={k} />);
  } else if (gainers.length === 0) {
    content = <p className="text-white/40 text-sm text-center py-4">Yükselen hisse bulunamadı</p>;
  } else {
    content = gainers.map((q, i) => (
      <StockRow key={q.symbol} quote={q} index={i} variant="gainer" />
    ));
  }

  return (
    <motion.div variants={fadeInUp}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <CardTitle>En Çok Yükselenler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">{content}</CardContent>
      </Card>
    </motion.div>
  );
}

// ── Section: Losers ───────────────────────────────────────────────────────────

interface LosersSectionProps { loading: boolean; losers: MarketQuote[] }
function LosersSection({ loading, losers }: Readonly<LosersSectionProps>) {
  let content: React.ReactNode;

  if (loading) {
    content = SKELETON_STOCK_KEYS.map((k) => <SkeletonStockRow key={k} />);
  } else if (losers.length === 0) {
    content = <p className="text-white/40 text-sm text-center py-4">Düşen hisse bulunamadı</p>;
  } else {
    content = losers.map((q, i) => (
      <StockRow key={q.symbol} quote={q} index={i} variant="loser" />
    ));
  }

  return (
    <motion.div variants={fadeInUp}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-danger" />
          </div>
          <CardTitle>En Çok Düşenler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">{content}</CardContent>
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
}
function BreadthSection({ loading, gainersCount, losersCount, unchangedCount }: Readonly<BreadthSectionProps>) {
  const total = gainersCount + losersCount + unchangedCount || 1;
  const gainPct     = (gainersCount   / total) * 100;
  const lossPct     = (losersCount    / total) * 100;
  const unchangedPct = (unchangedCount / total) * 100;

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Piyasa Genişliği
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 rounded-full bg-white/10" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-16 rounded-xl bg-white/10" />
                <div className="h-16 rounded-xl bg-white/10" />
                <div className="h-16 rounded-xl bg-white/10" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex h-4 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${gainPct}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="bg-success"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${unchangedPct}%` }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="bg-white/30"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${lossPct}%` }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="bg-danger"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-xl bg-success/10">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowUpRight className="w-4 h-4 text-success" />
                    <span className="text-success font-bold text-lg">{gainersCount}</span>
                  </div>
                  <p className="text-xs text-white/40">Yükselen</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5">
                  <span className="text-white/60 font-bold text-lg">{unchangedCount}</span>
                  <p className="text-xs text-white/40">Değişmeyen</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-danger/10">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowDownRight className="w-4 h-4 text-danger" />
                    <span className="text-danger font-bold text-lg">{losersCount}</span>
                  </div>
                  <p className="text-xs text-white/40">Düşen</p>
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [result] = await Promise.allSettled([marketService.getOverview()]);
    if (result.status === 'fulfilled') setMarket(result.value);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build a symbol → quote lookup for key metrics
  const quoteMap = new Map<string, MarketQuote>(
    market?.quotes?.map((q) => [q.symbol, q]) ?? []
  );

  // BIST stocks (ending in .IS, excluding the index itself)
  const bistStocks = market?.quotes?.filter(isBistStock) ?? [];
  const gainers = bistStocks
    .filter((q) => q.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 5);
  const losers = bistStocks
    .filter((q) => q.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 5);
  const unchanged = bistStocks.filter((q) => q.changePercent === 0);

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <Globe className="w-7 h-7 text-primary" />
            Piyasa
          </h1>
          <p className="text-white/60">Piyasa genel görünümü ve önemli göstergeler</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-white/40 text-sm">
            <Clock className="w-4 h-4" />
            <span>Son güncelleme: {formatLastUpdated(lastUpdated)}</span>
          </div>
          <Button variant="outline" className="border-white/20 text-white" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Yenile
          </Button>
        </div>
      </motion.div>

      {/* Key Metrics Grid */}
      <MetricsSection loading={loading} quoteMap={quoteMap} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gainers & Losers */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <GainersSection loading={loading} gainers={gainers} />
          <LosersSection  loading={loading} losers={losers}   />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <BreadthSection
            loading={loading}
            gainersCount={gainers.length}
            losersCount={losers.length}
            unchangedCount={unchanged.length}
          />
        </div>
      </div>
    </motion.div>
  );
}

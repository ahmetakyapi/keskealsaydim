import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart,
  Activity,
  Clock,
  RefreshCw,
  Zap,
  ShieldCheck,
  Target,
  Globe2,
  Landmark,
  Radio,
  WifiOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ShimmerCard, ShimmerRow, ShimmerProgress } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/authStore';
import { formatCompact, formatCurrency, formatPercent, getChangeColor } from '@/lib/utils';
import CountUp from 'react-countup';
import { Link } from 'react-router-dom';
import { portfolioService } from '@/services/portfolioService';
import { marketService } from '@/services/marketService';
import type { PortfolioSummary, MarketOverview, Investment, MarketQuote } from '@/types';

// ── Animation variants ────────────────────────────────────────────────────────

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

// ── Constants ─────────────────────────────────────────────────────────────────

const MARKET_LABELS: Record<string, string> = {
  'XU100.IS': 'BIST 100',
  'USDTRY=X': 'USD/TRY',
  'EURTRY=X': 'EUR/TRY',
  'GC=F': 'Altin',
};

// These must match the symbols fetched by api/market/overview.go
const BIST30_SYMBOLS = [
  'AKBNK.IS', 'ASELS.IS', 'BIMAS.IS', 'EREGL.IS', 'FROTO.IS',
  'GARAN.IS', 'KCHOL.IS', 'THYAO.IS', 'TUPRS.IS', 'YKBNK.IS',
];

const BIST100_SYMBOLS = [
  'AKBNK.IS', 'ASELS.IS', 'BIMAS.IS', 'CCOLA.IS', 'ENKAI.IS',
  'EREGL.IS', 'FROTO.IS', 'GARAN.IS', 'ISCTR.IS', 'KCHOL.IS',
  'MAVI.IS', 'PETKM.IS', 'SAHOL.IS', 'SISE.IS', 'TCELL.IS',
  'THYAO.IS', 'TUPRS.IS', 'YKBNK.IS',
];

const NASDAQ_SYMBOLS = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL',
  'META', 'TSLA', 'NFLX', 'AMD', 'AVGO',
];

const MARKET_CAP_LEADER_SYMBOLS = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL',
  'META', 'BRK-B', 'TSLA', 'TSM', 'JPM', 'LLY', 'V',
];

const BIST30_SET = new Set(BIST30_SYMBOLS);
const BIST100_SET = new Set(BIST100_SYMBOLS);
const NASDAQ_SET = new Set(NASDAQ_SYMBOLS);
const MARKET_CAP_SET = new Set(MARKET_CAP_LEADER_SYMBOLS);

// ── Pure helpers ──────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Gunaydin';
  if (hour < 18) return 'Iyi gunler';
  return 'Iyi aksamlar';
}

function formatLastUpdated(lastUpdated: Date | null): string {
  if (!lastUpdated) return 'Simdi';
  const diffSec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
  if (diffSec < 60) return 'Az once';
  return `${Math.floor(diffSec / 60)} dk once`;
}

function sortByProfitDesc(holdings: Investment[]): Investment[] {
  return [...holdings].sort((a, b) => b.profitPercent - a.profitPercent);
}

function sortByWeightDesc(holdings: Investment[]): Investment[] {
  return [...holdings].sort((a, b) => b.weight - a.weight);
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function computePortfolioHealth(portfolio: PortfolioSummary | null): number {
  if (!portfolio || portfolio.holdings.length === 0) return 0;
  const diversification = clamp(portfolio.holdings.length * 7, 0, 25);
  const totalReturn = clamp(portfolio.totalProfitPercent * 0.65, -20, 35);
  const dailyTrend = clamp(portfolio.dailyChangePercent * 0.5, -10, 15);
  return clamp(45 + diversification + totalReturn + dailyTrend);
}

function filterQuotes(quotes: MarketQuote[], symbolSet: Set<string>): MarketQuote[] {
  return quotes.filter((q) => symbolSet.has(q.symbol));
}

function displaySymbol(symbol: string): string {
  return symbol.replace('.IS', '');
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

function SummaryUnavailableCard({
  label,
  message,
  icon: Icon,
}: Readonly<{
  label: string;
  message: string;
  icon: React.ElementType;
}>) {
  return (
    <GlassCard className="p-6 relative overflow-hidden border border-white/[0.08] bg-white/[0.03]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_55%)]" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center ring-1 ring-white/10">
            <Icon className="w-6 h-6 text-white/45" />
          </div>
          <Badge variant="secondary" className="bg-white/[0.05] text-white/60 border-white/10">
            Veri yok
          </Badge>
        </div>
        <p className="text-white/50 text-xs uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl md:text-3xl font-bold text-white/75">Bekleniyor</p>
        <p className="text-sm mt-1.5 text-white/35">{message}</p>
      </div>
    </GlassCard>
  );
}

// ── Premium Skeleton Components ───────────────────────────────────────────────

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome header shimmer */}
      <div className="skeleton-shimmer rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="w-48 h-7 rounded-lg skeleton-shimmer" />
            <div className="w-64 h-4 rounded-lg skeleton-shimmer" />
          </div>
          <div className="w-24 h-10 rounded-xl skeleton-shimmer" />
        </div>
      </div>

      {/* Market pulse shimmer */}
      <div className="skeleton-shimmer rounded-2xl p-4">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={`pulse-sk-${i}`} className="min-w-[160px] rounded-xl skeleton-shimmer p-3 space-y-2">
              <div className="w-12 h-3 rounded skeleton-shimmer" />
              <div className="w-20 h-5 rounded skeleton-shimmer" />
              <div className="w-14 h-3 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>

      {/* Summary cards shimmer */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <ShimmerCard key={`card-sk-${i}`} />
        ))}
      </div>

      {/* Main grid shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="skeleton-shimmer rounded-2xl p-6 space-y-4">
            <div className="w-32 h-5 rounded-lg skeleton-shimmer" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={`mq-sk-${i}`} className="skeleton-shimmer rounded-xl p-4 space-y-2">
                  <div className="w-16 h-3 rounded skeleton-shimmer" />
                  <div className="w-24 h-5 rounded skeleton-shimmer" />
                </div>
              ))}
            </div>
          </div>
          <div className="skeleton-shimmer rounded-2xl p-6 space-y-3">
            <div className="w-40 h-5 rounded-lg skeleton-shimmer" />
            {Array.from({ length: 4 }, (_, i) => (
              <ShimmerRow key={`perf-sk-${i}`} />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="skeleton-shimmer rounded-2xl p-6 space-y-4">
            <div className="w-32 h-5 rounded-lg skeleton-shimmer" />
            <div className="w-20 h-8 rounded-lg skeleton-shimmer" />
            <div className="w-full h-3 rounded-full skeleton-shimmer" />
          </div>
          {Array.from({ length: 2 }, (_, i) => (
            <div key={`side-sk-${i}`} className="skeleton-shimmer rounded-2xl p-6 space-y-3">
              <div className="w-28 h-5 rounded-lg skeleton-shimmer" />
              {Array.from({ length: 3 }, (_, j) => (
                <ShimmerProgress key={`sp-${i}-${j}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface TotalValueCardProps {
  portfolio: PortfolioSummary | null;
  unavailable?: boolean;
}
function TotalValueCard({ portfolio }: Readonly<TotalValueCardProps>) {
  if (!portfolio) {
    return (
      <SummaryUnavailableCard
        label="Toplam Deger"
        message="Portfoy servisine ulasilamadigi icin toplam deger hesaplaniyor."
        icon={Wallet}
      />
    );
  }

  const dailyPct = portfolio?.dailyChangePercent ?? 0;
  const totalVal = portfolio?.totalValue ?? 0;
  return (
    <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 card-glow-green">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors duration-500" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/20">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <Badge variant={dailyPct >= 0 ? 'success' : 'danger'}>
            {formatPercent(dailyPct)}
          </Badge>
        </div>
        <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Toplam Deger</p>
        <p className="text-2xl md:text-3xl font-bold text-white number-ticker">
          <CountUp end={totalVal} prefix="₺" separator="." decimals={2} decimal="," duration={1.2} />
        </p>
      </div>
    </GlassCard>
  );
}

interface TotalProfitCardProps {
  portfolio: PortfolioSummary | null;
}
function TotalProfitCard({ portfolio }: Readonly<TotalProfitCardProps>) {
  if (!portfolio) {
    return (
      <SummaryUnavailableCard
        label="Toplam Kar"
        message="Kar ve getiri alanlari yeni veri geldiginde otomatik dolacak."
        icon={TrendingUp}
      />
    );
  }

  const profit = portfolio?.totalProfit ?? 0;
  const profitPct = portfolio?.totalProfitPercent ?? 0;
  const isPositive = profit >= 0;
  return (
    <GlassCard className={`p-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 ${isPositive ? 'card-glow-green' : 'card-glow-red'}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${isPositive ? 'from-success/10' : 'from-danger/10'} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl ${isPositive ? 'bg-success/20 ring-1 ring-success/20' : 'bg-danger/20 ring-1 ring-danger/20'} flex items-center justify-center`}>
            {isPositive
              ? <TrendingUp className="w-6 h-6 text-success" />
              : <TrendingDown className="w-6 h-6 text-danger" />
            }
          </div>
        </div>
        <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Toplam Kar</p>
        <p className={`text-2xl md:text-3xl font-bold number-ticker ${getChangeColor(profit)}`}>
          <CountUp end={profit} prefix={isPositive ? '+₺' : '-₺'} separator="." decimals={2} decimal="," duration={1.2} formattingFn={(val) => `${isPositive ? '+' : ''}₺${Math.abs(val).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        </p>
        <p className={`text-sm mt-1.5 ${getChangeColor(profitPct)}`}>
          {formatPercent(profitPct)} getiri
        </p>
      </div>
    </GlassCard>
  );
}

interface DailyChangeCardProps {
  portfolio: PortfolioSummary | null;
}
function DailyChangeCard({ portfolio }: Readonly<DailyChangeCardProps>) {
  if (!portfolio) {
    return (
      <SummaryUnavailableCard
        label="Gunluk Degisim"
        message="Canli gunluk degisim icin portfoy verisi bekleniyor."
        icon={Activity}
      />
    );
  }

  const daily = portfolio?.dailyChange ?? 0;
  const dailyPct = portfolio?.dailyChangePercent ?? 0;
  const isPositive = daily > 0;
  return (
    <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 card-glow-blue">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center ring-1 ring-secondary/20">
            <Activity className="w-6 h-6 text-secondary" />
          </div>
          <LiveIndicator />
        </div>
        <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Gunluk Degisim</p>
        <p className={`text-2xl md:text-3xl font-bold number-ticker ${getChangeColor(daily)}`}>
          <CountUp end={daily} prefix={isPositive ? '+₺' : '₺'} separator="." decimals={2} decimal="," duration={1.2} />
        </p>
        <p className={`text-sm mt-1.5 ${getChangeColor(dailyPct)}`}>
          {formatPercent(dailyPct)} bugun
        </p>
      </div>
    </GlassCard>
  );
}

interface MarketQuoteItemProps { quote: MarketQuote; index: number }
function MarketQuoteItem({ quote, index }: Readonly<MarketQuoteItemProps>) {
  const isUp = quote.changePercent >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={`p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-white/10 ${isUp ? 'card-glow-green' : 'card-glow-red'}`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-white/50 text-xs font-medium">{MARKET_LABELS[quote.symbol]}</p>
        <div className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-success' : 'bg-danger'}`} />
      </div>
      <p className="font-bold text-white text-lg number-ticker">
        {quote.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
      </p>
      <div className={`flex items-center gap-1 text-sm mt-1 ${getChangeColor(quote.changePercent)}`}>
        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        <span className="font-semibold">{formatPercent(quote.changePercent)}</span>
      </div>
    </motion.div>
  );
}

interface PerformerRowProps { holding: Investment; index: number }
function PerformerRow({ holding, index }: Readonly<PerformerRowProps>) {
  const isPositive = holding.profitPercent >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-all duration-300 hover:scale-[1.01] cursor-pointer group border border-transparent hover:border-white/10"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${isPositive ? 'bg-success/15 ring-1 ring-success/20' : 'bg-danger/15 ring-1 ring-danger/20'}`}>
          {isPositive
            ? <ArrowUpRight className="w-5 h-5 text-success" />
            : <ArrowDownRight className="w-5 h-5 text-danger" />
          }
        </div>
        <div>
          <p className="font-semibold text-white">{holding.symbol}</p>
          <p className="text-xs text-white/35">{holding.symbolName}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-white number-ticker">{formatCurrency(holding.currentValue)}</p>
        <p className={`text-sm font-semibold ${getChangeColor(holding.profitPercent)}`}>
          {isPositive ? '+' : ''}{formatPercent(holding.profitPercent)}
        </p>
      </div>
    </motion.div>
  );
}

interface AllocationRowProps { holding: Investment; index: number }
function AllocationRow({ holding, index }: Readonly<AllocationRowProps>) {
  return (
    <motion.div
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: '100%' }}
      transition={{ delay: index * 0.1 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="text-white font-medium">{holding.symbol}</span>
        <span className="text-white/50 font-mono text-xs">{holding.weight.toFixed(1)}%</span>
      </div>
      <Progress value={holding.weight} variant="gradient" size="sm" />
    </motion.div>
  );
}

interface RecentRowProps { holding: Investment; index: number }
function RecentRow({ holding, index }: Readonly<RecentRowProps>) {
  const isPositive = holding.profitPercent >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${isPositive ? 'bg-success/15' : 'bg-danger/15'}`}>
          {isPositive
            ? <TrendingUp className="w-4 h-4 text-success" />
            : <TrendingDown className="w-4 h-4 text-danger" />
          }
        </div>
        <div>
          <p className="font-medium text-white text-sm">{holding.symbol}</p>
          <p className="text-xs text-white/35">
            {new Date(holding.buyDate).toLocaleDateString('tr-TR')}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-white text-sm number-ticker">{formatCurrency(holding.currentValue)}</p>
        <p className={`text-xs font-medium ${getChangeColor(holding.profitPercent)}`}>
          {isPositive ? '+' : ''}{formatPercent(holding.profitPercent)}
        </p>
      </div>
    </motion.div>
  );
}

interface MarketPulseStripProps { loading: boolean; quotes: MarketQuote[] }
function MarketPulseStrip({ loading, quotes }: Readonly<MarketPulseStripProps>) {
  if (loading || quotes.length === 0) return null;

  return (
    <motion.div variants={fadeInUp}>
      <GlassCard className="p-3 relative overflow-hidden border-breathing">
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-surface to-transparent pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-surface to-transparent pointer-events-none z-10" />
        <div className="flex items-center gap-2 px-2 mb-2">
          <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
          <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Piyasa Nabzi</p>
          <LiveIndicator />
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex min-w-max gap-2 px-2 pb-1">
            {quotes.map((quote) => {
              const isUp = quote.changePercent >= 0;
              return (
                <div key={quote.symbol} className="min-w-[150px] rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 hover:bg-white/[0.06] transition-colors">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">{MARKET_LABELS[quote.symbol] ?? quote.symbol}</p>
                  <p className="text-white font-semibold text-sm mt-0.5 number-ticker">
                    {quote.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(quote.changePercent)}`}>
                    {isUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                    <span className="font-medium">{formatPercent(quote.changePercent)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

interface PortfolioHealthCardProps { portfolio: PortfolioSummary | null }
function PortfolioHealthCard({ portfolio }: Readonly<PortfolioHealthCardProps>) {
  if (!portfolio) {
    return (
      <motion.div variants={fadeInUp}>
        <Card className="overflow-hidden relative">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Portfoy Sagligi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-white/55">Portfoy verisi olmadan risk ve dagilim skoru hesaplanamiyor.</p>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/35">
              Veri geldiginde konsantrasyon, acik pozisyon sayisi ve genel skor burada gosterilecek.
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const score = computePortfolioHealth(portfolio);
  const scoreLabel = score >= 75 ? 'Guclu' : score >= 50 ? 'Dengeli' : 'Riskli';
  const scoreColor = score >= 75 ? 'text-success' : score >= 50 ? 'text-secondary' : 'text-danger';
  const scoreBg = score >= 75 ? 'from-success/20' : score >= 50 ? 'from-secondary/20' : 'from-danger/20';

  const openInvestments = portfolio?.openInvestments ?? 0;
  const totalInvestments = portfolio?.totalInvestments ?? 0;
  const concentration = (portfolio?.holdings ?? []).reduce((max, item) => Math.max(max, item.weight), 0);

  return (
    <motion.div variants={fadeInUp}>
      <Card className="overflow-hidden relative">
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${scoreBg} to-transparent`} />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Portfoy Sagligi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-white/50">Genel skor</p>
              <p className={`text-sm font-semibold ${scoreColor}`}>{scoreLabel}</p>
            </div>
            <div className="flex items-end gap-2">
              <p className={`text-4xl font-bold ${scoreColor} number-ticker`}>
                <CountUp end={Math.round(score)} duration={1.5} />
              </p>
              <p className="text-white/30 pb-1 text-sm">/100</p>
            </div>
            <Progress value={score} variant="gradient" className="mt-3" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <GlassCard className="p-3 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-3.5 h-3.5 text-secondary" />
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Konsantrasyon</p>
              </div>
              <p className="text-white font-bold text-sm number-ticker">{concentration.toFixed(1)}%</p>
              <p className="text-[10px] text-white/30 mt-0.5">En buyuk pozisyon</p>
            </GlassCard>
            <GlassCard className="p-3 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Acik Pozisyon</p>
              </div>
              <p className="text-white font-bold text-sm">{openInvestments}</p>
              <p className="text-[10px] text-white/30 mt-0.5">Toplam: {totalInvestments}</p>
            </GlassCard>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Section: Market Summary ───────────────────────────────────────────────────

interface MarketSectionProps { loading: boolean; quotes: MarketQuote[] }
function MarketSection({ loading, quotes }: Readonly<MarketSectionProps>) {
  if (loading) return null;

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Piyasa Ozeti
          </CardTitle>
          <LiveIndicator />
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="text-white/35 text-sm text-center py-4">Piyasa verisi alinamadi</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quotes.map((quote, i) => (
                <MarketQuoteItem key={quote.symbol} quote={quote} index={i} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Section: Top Performers ───────────────────────────────────────────────────

interface TopPerformersProps {
  loading: boolean;
  performers: Investment[];
  unavailable?: boolean;
}
function TopPerformersSection({ loading, performers, unavailable }: Readonly<TopPerformersProps>) {
  if (loading) return null;

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            En Iyi Performans
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {unavailable ? (
            <p className="text-white/35 text-sm text-center py-4">Portfoy verisi alinamadi</p>
          ) : performers.length === 0 ? (
            <p className="text-white/35 text-sm text-center py-4">Portfolyde yatirim bulunamadi</p>
          ) : (
            performers.map((h, i) => <PerformerRow key={h.id} holding={h} index={i} />)
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Section: Portfolio Allocation ─────────────────────────────────────────────

interface AllocationSectionProps {
  loading: boolean;
  allocation: Investment[];
  unavailable?: boolean;
}
function AllocationSection({ loading, allocation, unavailable }: Readonly<AllocationSectionProps>) {
  if (loading) return null;

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Portfoy Dagilimi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {unavailable ? (
            <p className="text-white/35 text-sm text-center py-4">Portfoy dagilimi hesaplanamadi</p>
          ) : allocation.length === 0 ? (
            <p className="text-white/35 text-sm text-center py-4">Portfolyde yatirim bulunamadi</p>
          ) : (
            allocation.map((h, i) => <AllocationRow key={h.id} holding={h} index={i} />)
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Section: Recent Investments ───────────────────────────────────────────────

interface RecentSectionProps {
  loading: boolean;
  recent: Investment[];
  unavailable?: boolean;
}
function RecentSection({ loading, recent, unavailable }: Readonly<RecentSectionProps>) {
  if (loading) return null;

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-secondary" />
            Son Yatirimlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {unavailable ? (
            <p className="text-white/35 text-sm text-center py-4">Son yatirimlar yuklenemedi</p>
          ) : recent.length === 0 ? (
            <p className="text-white/35 text-sm text-center py-4">Portfolyde yatirim bulunamadi</p>
          ) : (
            recent.map((h, i) => <RecentRow key={h.id} holding={h} index={i} />)
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PortfolioOnboardingCard() {
  return (
    <motion.div variants={fadeInUp}>
      <GlassCard className="p-5 md:p-6 relative overflow-hidden border-breathing">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_42%)]" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-white">Portfoyunuzu kurmaya hazirsiniz</p>
            </div>
            <p className="text-white/55 text-sm leading-6">
              Ilk yatiriminizi eklediginizde toplam deger, getiri, dagilim ve en iyi performans alanlari gercek verilerle dolacak.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto">
            <Link to="/portfolio">
              <Button variant="gradient" className="w-full">
                <Wallet className="w-4 h-4 mr-2" />
                Ilk Yatirimi Ekle
              </Button>
            </Link>
            <Link to="/compare">
              <Button variant="outline" className="w-full border-white/15 text-white/80 hover:text-white hover:border-white/30">
                <BarChart3 className="w-4 h-4 mr-2" />
                Ornek Karsilastir
              </Button>
            </Link>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

type MarketListMode = 'change' | 'marketCap';

interface MarketListCardProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  loading: boolean;
  quotes: MarketQuote[];
  mode?: MarketListMode;
}

function MarketListCard({
  title,
  subtitle,
  icon: Icon,
  loading,
  quotes,
  mode = 'change',
}: Readonly<MarketListCardProps>) {
  if (loading) {
    return (
      <motion.div variants={scaleIn}>
        <div className="skeleton-shimmer rounded-2xl p-6 space-y-3">
          <div className="w-24 h-5 rounded-lg skeleton-shimmer" />
          <div className="w-40 h-3 rounded-lg skeleton-shimmer" />
          {Array.from({ length: 5 }, (_, i) => (
            <ShimmerRow key={`ml-sk-${i}`} />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={scaleIn}>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
          <p className="text-xs text-white/40 mt-1">{subtitle}</p>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {quotes.length === 0 ? (
            <p className="text-white/35 text-sm text-center py-4">Liste verisi alinamadi</p>
          ) : (
            quotes.map((quote, index) => {
              const isUp = quote.changePercent >= 0;
              return (
                <motion.div
                  key={`${title}-${quote.symbol}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] transition-all duration-200 group border border-transparent hover:border-white/[0.06]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.06] text-white/60 text-xs font-bold flex items-center justify-center group-hover:bg-primary/15 group-hover:text-primary transition-colors">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{displaySymbol(quote.symbol)}</p>
                      <p className="text-[10px] text-white/35 truncate">{quote.name}</p>
                    </div>
                  </div>

                  {mode === 'marketCap' ? (
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-white number-ticker">
                        {quote.marketCap > 0 ? formatCompact(quote.marketCap) : '-'}
                      </p>
                      <p className="text-[10px] text-white/40">Piyasa degeri</p>
                    </div>
                  ) : (
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-white number-ticker">{formatCurrency(quote.price)}</p>
                      <div className={`text-xs font-medium flex items-center justify-end gap-0.5 ${getChangeColor(quote.changePercent)}`}>
                        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {isUp ? '+' : ''}{formatPercent(quote.changePercent)}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [market, setMarket] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [portfolioError, setPortfolioError] = useState(false);
  const [marketError, setMarketError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [portfolioResult, marketResult] = await Promise.allSettled([
      portfolioService.getPortfolio(),
      marketService.getOverview(),
    ]);
    setPortfolioError(portfolioResult.status === 'rejected');
    setMarketError(marketResult.status === 'rejected');
    if (portfolioResult.status === 'fulfilled') setPortfolio(portfolioResult.value);
    if (marketResult.status === 'fulfilled') setMarket(marketResult.value);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allQuotes = market?.quotes ?? [];
  const keyQuotes = allQuotes.filter((q) => q.symbol in MARKET_LABELS);
  const pulseQuotes = allQuotes.filter((q) => !['XU100.IS'].includes(q.symbol)).slice(0, 12);
  const topPerformers = portfolio?.holdings ? sortByProfitDesc(portfolio.holdings).slice(0, 4) : [];
  const allocation = portfolio?.holdings ? sortByWeightDesc(portfolio.holdings).slice(0, 5) : [];
  const recentInvestments = portfolio?.holdings?.slice(0, 3) ?? [];
  const bist30List = filterQuotes(allQuotes, BIST30_SET)
    .sort((a, b) => b.changePercent - a.changePercent).slice(0, 8);
  const bist100List = filterQuotes(allQuotes, BIST100_SET)
    .sort((a, b) => b.changePercent - a.changePercent).slice(0, 8);
  const nasdaqList = filterQuotes(allQuotes, NASDAQ_SET)
    .sort((a, b) => b.changePercent - a.changePercent).slice(0, 8);
  const marketCapLeaders = filterQuotes(allQuotes, MARKET_CAP_SET)
    .filter((q) => q.marketCap > 0)
    .sort((a, b) => b.marketCap - a.marketCap).slice(0, 8);
  const portfolioUnavailable = !portfolio && portfolioError;
  const marketUnavailable = !market && marketError;
  const showPortfolioOnboarding = Boolean(portfolio && portfolio.holdings.length === 0);

  if (loading) {
    return (
      <motion.div
        className="rounded-3xl border border-white/[0.06] bg-[linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-3 md:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <DashboardLoadingSkeleton />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-6 rounded-3xl border border-white/[0.06] bg-[linear-gradient(145deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))] p-3 md:p-4 shadow-[0_28px_90px_-62px_rgba(20,184,166,0.85)]"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Welcome Header */}
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            {getGreeting()}, <span className="text-gradient">{user?.name?.split(' ')[0]}</span>!
          </h1>
          <p className="text-white/50 text-sm">Iste portfolyonun guncel durumu</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-white/35 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatLastUpdated(lastUpdated)}</span>
          </div>
          <Button variant="outline" className="border-white/15 text-white/80 hover:text-white hover:border-white/30 transition-all" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </motion.div>

      {(portfolioError || marketError) && (
        <motion.div
          variants={fadeInUp}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl text-sm
            ${portfolioUnavailable && marketUnavailable
              ? 'border border-danger/25 bg-danger/10 text-danger'
              : 'border border-yellow-500/25 bg-yellow-500/10 text-yellow-200'}
          `}
        >
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">
            {portfolioError && marketError
              ? 'Portfoy ve piyasa verisi su an yenilenemedi. Yerel backend veya API erisimini kontrol edin.'
              : portfolioError
                ? 'Portfoy verisi yenilenemedi. Piyasa kartlari guncel olabilir ancak portfoy alanlari eksik kaldi.'
                : 'Piyasa verisi yenilenemedi. Portfoy kartlari guncel olabilir ancak canli piyasa alanlari eksik kaldi.'}
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

      <MarketPulseStrip loading={loading} quotes={pulseQuotes} />

      {/* Portfolio Summary Cards */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TotalValueCard portfolio={portfolioUnavailable ? null : portfolio} />
        <TotalProfitCard portfolio={portfolioUnavailable ? null : portfolio} />
        <DailyChangeCard portfolio={portfolioUnavailable ? null : portfolio} />

        {/* Quick Action - Keske Alsaydim? */}
        <GlassCard className="p-6 bg-gradient-to-br from-primary/15 via-primary/5 to-secondary/10 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 card-glow-green">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/15 rounded-full blur-3xl group-hover:bg-primary/25 transition-colors duration-500" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-secondary/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-white/70 font-medium text-sm">Hizli Islem</span>
            </div>
            <p className="text-white/45 text-xs mb-4">
              Iki hisseyi karsilastir ve firsatlari kesfet
            </p>
            <Link to="/compare">
              <Button variant="gradient" className="w-full group/btn">
                Keske Alsaydim?
                <ArrowUpRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </GlassCard>
      </motion.div>

      {showPortfolioOnboarding && <PortfolioOnboardingCard />}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MarketSection loading={loading} quotes={marketUnavailable ? [] : keyQuotes} />
          <TopPerformersSection
            loading={loading}
            performers={portfolioUnavailable ? [] : topPerformers}
            unavailable={portfolioUnavailable}
          />
        </div>

        <div className="space-y-6">
          <PortfolioHealthCard portfolio={portfolioUnavailable ? null : portfolio} />
          <AllocationSection
            loading={loading}
            allocation={portfolioUnavailable ? [] : allocation}
            unavailable={portfolioUnavailable}
          />
          <RecentSection
            loading={loading}
            recent={portfolioUnavailable ? [] : recentInvestments}
            unavailable={portfolioUnavailable}
          />
        </div>
      </div>

      {/* Market Lists Header */}
      <motion.div variants={fadeInUp}>
        <GlassCard className="p-5 md:p-6 border-breathing">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-white">Piyasa Listeleri</p>
            <LiveIndicator />
          </div>
          <p className="text-xs text-white/40">
            BIST30, BIST100, Nasdaq ve piyasa degeri liderleri gercek zamanli fiyat verisiyle listelenir.
          </p>
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MarketListCard
          title="BIST30"
          subtitle="Gun ici degisime gore one cikanlar"
          icon={Landmark}
          loading={loading}
          quotes={bist30List}
        />
        <MarketListCard
          title="BIST100"
          subtitle="Secili hisselerde anlik hareket"
          icon={BarChart3}
          loading={loading}
          quotes={bist100List}
        />
        <MarketListCard
          title="Nasdaq"
          subtitle="ABD teknoloji tarafinda one cikanlar"
          icon={Globe2}
          loading={loading}
          quotes={nasdaqList}
        />
        <MarketListCard
          title="Piyasa Degeri Liderleri"
          subtitle="En degerli sirketler"
          icon={Crown}
          loading={loading}
          quotes={marketCapLeaders}
          mode="marketCap"
        />
      </div>
    </motion.div>
  );
}

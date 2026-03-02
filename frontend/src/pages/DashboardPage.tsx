import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatPercent, getChangeColor } from '@/lib/utils';
import CountUp from 'react-countup';
import { Link } from 'react-router-dom';
import { portfolioService } from '@/services/portfolioService';
import { marketService } from '@/services/marketService';
import type { PortfolioSummary, MarketOverview, Investment, MarketQuote } from '@/types';

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

const MARKET_LABELS: Record<string, string> = {
  'XU100.IS': 'BIST 100',
  'USDTRY=X': 'USD/TRY',
  'EURTRY=X': 'EUR/TRY',
  'GC=F': 'Altın',
};

const SKELETON_MARKET_KEYS = ['sk-m-0', 'sk-m-1', 'sk-m-2', 'sk-m-3'];
const SKELETON_ALLOC_KEYS = ['sk-a-0', 'sk-a-1', 'sk-a-2', 'sk-a-3'];

// ── Pure helpers ──────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

function formatLastUpdated(lastUpdated: Date | null): string {
  if (!lastUpdated) return 'Şimdi';
  const diffSec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
  if (diffSec < 60) return 'Az önce';
  return `${Math.floor(diffSec / 60)} dk önce`;
}

function sortByProfitDesc(holdings: Investment[]): Investment[] {
  return [...holdings].sort((a, b) => b.profitPercent - a.profitPercent);
}

function sortByWeightDesc(holdings: Investment[]): Investment[] {
  return [...holdings].sort((a, b) => b.weight - a.weight);
}

// ── Skeleton primitives ───────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-white/10" />
        <div className="w-16 h-6 rounded-full bg-white/10" />
      </div>
      <div className="w-24 h-4 rounded bg-white/10 mb-2" />
      <div className="w-36 h-8 rounded bg-white/10" />
    </div>
  );
}

function SkeletonPerformerRow() {
  return (
    <div className="animate-pulse flex items-center justify-between p-4 rounded-xl bg-white/5">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/10" />
        <div className="space-y-2">
          <div className="w-16 h-4 rounded bg-white/10" />
          <div className="w-24 h-3 rounded bg-white/10" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <div className="w-24 h-4 rounded bg-white/10" />
        <div className="w-16 h-3 rounded bg-white/10" />
      </div>
    </div>
  );
}

function SkeletonRecentRow() {
  return (
    <div className="animate-pulse flex items-center justify-between p-3 rounded-xl bg-white/5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/10" />
        <div className="space-y-2">
          <div className="w-16 h-3 rounded bg-white/10" />
          <div className="w-20 h-3 rounded bg-white/10" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <div className="w-20 h-3 rounded bg-white/10" />
        <div className="w-14 h-3 rounded bg-white/10" />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface TotalValueCardProps { portfolio: PortfolioSummary | null }
function TotalValueCard({ portfolio }: Readonly<TotalValueCardProps>) {
  const dailyPct = portfolio?.dailyChangePercent ?? 0;
  const totalVal = portfolio?.totalValue ?? 0;
  return (
    <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <Badge variant={dailyPct >= 0 ? 'success' : 'danger'}>
            {formatPercent(dailyPct)}
          </Badge>
        </div>
        <p className="text-white/60 text-sm mb-1">Toplam Değer</p>
        <p className="text-2xl md:text-3xl font-bold text-white">
          ₺<CountUp end={totalVal} separator="." decimals={2} decimal="," duration={1} />
        </p>
      </div>
    </GlassCard>
  );
}

interface TotalProfitCardProps { portfolio: PortfolioSummary | null }
function TotalProfitCard({ portfolio }: Readonly<TotalProfitCardProps>) {
  const profit = portfolio?.totalProfit ?? 0;
  const profitPct = portfolio?.totalProfitPercent ?? 0;
  const sign = profit >= 0 ? '+' : '';
  return (
    <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
      <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-success" />
          </div>
        </div>
        <p className="text-white/60 text-sm mb-1">Toplam Kar</p>
        <p className={`text-2xl md:text-3xl font-bold ${getChangeColor(profit)}`}>
          {sign}₺<CountUp end={profit} separator="." decimals={2} decimal="," duration={1} />
        </p>
        <p className={`text-sm mt-1 ${getChangeColor(profitPct)}`}>
          {formatPercent(profitPct)} getiri
        </p>
      </div>
    </GlassCard>
  );
}

interface DailyChangeCardProps { portfolio: PortfolioSummary | null }
function DailyChangeCard({ portfolio }: Readonly<DailyChangeCardProps>) {
  const daily = portfolio?.dailyChange ?? 0;
  const dailyPct = portfolio?.dailyChangePercent ?? 0;
  const sign = daily > 0 ? '+' : '';
  return (
    <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
            <Activity className="w-6 h-6 text-secondary" />
          </div>
        </div>
        <p className="text-white/60 text-sm mb-1">Günlük Değişim</p>
        <p className={`text-2xl md:text-3xl font-bold ${getChangeColor(daily)}`}>
          {sign}₺<CountUp end={daily} separator="." decimals={2} decimal="," duration={1} />
        </p>
        <p className={`text-sm mt-1 ${getChangeColor(dailyPct)}`}>
          {formatPercent(dailyPct)} bugün
        </p>
      </div>
    </GlassCard>
  );
}

interface MarketQuoteItemProps { quote: MarketQuote; index: number }
function MarketQuoteItem({ quote, index }: Readonly<MarketQuoteItemProps>) {
  const TrendIcon = quote.changePercent >= 0 ? TrendingUp : TrendingDown;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
    >
      <p className="text-white/60 text-sm mb-1">{MARKET_LABELS[quote.symbol]}</p>
      <p className="font-bold text-white text-lg">
        {quote.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
      </p>
      <div className={`flex items-center gap-1 text-sm ${getChangeColor(quote.changePercent)}`}>
        <TrendIcon className="w-3 h-3" />
        {formatPercent(quote.changePercent)}
      </div>
    </motion.div>
  );
}

interface PerformerRowProps { holding: Investment; index: number }
function PerformerRow({ holding, index }: Readonly<PerformerRowProps>) {
  const isPositive = holding.profitPercent >= 0;
  const iconBg = isPositive ? 'bg-success/20' : 'bg-danger/20';
  const sign = isPositive ? '+' : '';
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.01] cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
          {isPositive
            ? <ArrowUpRight className="w-5 h-5 text-success" />
            : <ArrowDownRight className="w-5 h-5 text-danger" />
          }
        </div>
        <div>
          <p className="font-semibold text-white">{holding.symbol}</p>
          <p className="text-xs text-white/40">{holding.symbolName}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-white">{formatCurrency(holding.currentValue)}</p>
        <p className={`text-sm font-semibold ${getChangeColor(holding.profitPercent)}`}>
          {sign}{formatPercent(holding.profitPercent)}
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
        <span className="text-white">{holding.symbol}</span>
        <span className="text-white/60">{holding.weight.toFixed(1)}%</span>
      </div>
      <Progress value={holding.weight} variant="gradient" size="sm" />
    </motion.div>
  );
}

interface RecentRowProps { holding: Investment; index: number }
function RecentRow({ holding, index }: Readonly<RecentRowProps>) {
  const isPositive = holding.profitPercent >= 0;
  const sign = isPositive ? '+' : '';
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center justify-between p-3 rounded-xl bg-white/5"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPositive ? 'bg-success/20' : 'bg-danger/20'}`}>
          {isPositive
            ? <TrendingUp className="w-4 h-4 text-success" />
            : <TrendingDown className="w-4 h-4 text-danger" />
          }
        </div>
        <div>
          <p className="font-medium text-white">{holding.symbol}</p>
          <p className="text-xs text-white/40">
            {new Date(holding.buyDate).toLocaleDateString('tr-TR')}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-white">{formatCurrency(holding.currentValue)}</p>
        <p className={`text-xs ${getChangeColor(holding.profitPercent)}`}>
          {sign}{formatPercent(holding.profitPercent)}
        </p>
      </div>
    </motion.div>
  );
}

// ── Section: Market Summary ───────────────────────────────────────────────────

interface MarketSectionProps { loading: boolean; quotes: MarketQuote[] }
function MarketSection({ loading, quotes }: Readonly<MarketSectionProps>) {
  let content: React.ReactNode;
  if (loading) {
    content = (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SKELETON_MARKET_KEYS.map((k) => (
          <div key={k} className="animate-pulse p-4 rounded-xl bg-white/5">
            <div className="w-16 h-3 rounded bg-white/10 mb-2" />
            <div className="w-20 h-5 rounded bg-white/10 mb-1" />
            <div className="w-12 h-3 rounded bg-white/10" />
          </div>
        ))}
      </div>
    );
  } else if (quotes.length === 0) {
    content = (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <p className="col-span-4 text-white/40 text-sm text-center py-4">
          Piyasa verisi alınamadı
        </p>
      </div>
    );
  } else {
    content = (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quotes.map((quote, i) => (
          <MarketQuoteItem key={quote.symbol} quote={quote} index={i} />
        ))}
      </div>
    );
  }

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Piyasa Özeti
          </CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    </motion.div>
  );
}

// ── Section: Top Performers ───────────────────────────────────────────────────

interface TopPerformersProps { loading: boolean; performers: Investment[] }
function TopPerformersSection({ loading, performers }: Readonly<TopPerformersProps>) {
  let content: React.ReactNode;
  if (loading) {
    content = (
      <>
        <SkeletonPerformerRow />
        <SkeletonPerformerRow />
        <SkeletonPerformerRow />
        <SkeletonPerformerRow />
      </>
    );
  } else if (performers.length === 0) {
    content = (
      <p className="text-white/40 text-sm text-center py-4">
        Portföyde yatırım bulunamadı
      </p>
    );
  } else {
    content = performers.map((h, i) => (
      <PerformerRow key={h.id} holding={h} index={i} />
    ));
  }

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            En İyi Performans
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">{content}</CardContent>
      </Card>
    </motion.div>
  );
}

// ── Section: Portfolio Allocation ─────────────────────────────────────────────

interface AllocationSectionProps { loading: boolean; allocation: Investment[] }
function AllocationSection({ loading, allocation }: Readonly<AllocationSectionProps>) {
  let content: React.ReactNode;
  if (loading) {
    content = SKELETON_ALLOC_KEYS.map((k) => (
      <div key={k} className="animate-pulse space-y-2">
        <div className="flex justify-between">
          <div className="w-16 h-3 rounded bg-white/10" />
          <div className="w-10 h-3 rounded bg-white/10" />
        </div>
        <div className="w-full h-2 rounded-full bg-white/10" />
      </div>
    ));
  } else if (allocation.length === 0) {
    content = (
      <p className="text-white/40 text-sm text-center py-4">
        Portföyde yatırım bulunamadı
      </p>
    );
  } else {
    content = allocation.map((h, i) => (
      <AllocationRow key={h.id} holding={h} index={i} />
    ));
  }

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Portföy Dağılımı
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">{content}</CardContent>
      </Card>
    </motion.div>
  );
}

// ── Section: Recent Investments ───────────────────────────────────────────────

interface RecentSectionProps { loading: boolean; recent: Investment[] }
function RecentSection({ loading, recent }: Readonly<RecentSectionProps>) {
  let content: React.ReactNode;
  if (loading) {
    content = (
      <>
        <SkeletonRecentRow />
        <SkeletonRecentRow />
        <SkeletonRecentRow />
      </>
    );
  } else if (recent.length === 0) {
    content = (
      <p className="text-white/40 text-sm text-center py-4">
        Portföyde yatırım bulunamadı
      </p>
    );
  } else {
    content = recent.map((h, i) => (
      <RecentRow key={h.id} holding={h} index={i} />
    ));
  }

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-secondary" />
            Son Yatırımlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">{content}</CardContent>
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [portfolioResult, marketResult] = await Promise.allSettled([
      portfolioService.getPortfolio(),
      marketService.getOverview(),
    ]);
    if (portfolioResult.status === 'fulfilled') setPortfolio(portfolioResult.value);
    if (marketResult.status === 'fulfilled') setMarket(marketResult.value);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const keyQuotes = market?.quotes?.filter((q) => q.symbol in MARKET_LABELS) ?? [];
  const topPerformers = portfolio?.holdings ? sortByProfitDesc(portfolio.holdings).slice(0, 4) : [];
  const allocation = portfolio?.holdings ? sortByWeightDesc(portfolio.holdings).slice(0, 5) : [];
  const recentInvestments = portfolio?.holdings?.slice(0, 3) ?? [];

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      {/* Welcome Header */}
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            {getGreeting()}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-white/60">İşte portföyünün güncel durumu</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-white/40 text-sm">
            <Clock className="w-4 h-4" />
            <span>Son güncelleme: {formatLastUpdated(lastUpdated)}</span>
          </div>
          <Button variant="outline" className="border-white/20 text-white" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </motion.div>

      {/* Portfolio Summary Cards */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? <SkeletonCard /> : <TotalValueCard portfolio={portfolio} />}
        {loading ? <SkeletonCard /> : <TotalProfitCard portfolio={portfolio} />}
        {loading ? <SkeletonCard /> : <DailyChangeCard portfolio={portfolio} />}

        {/* Quick Action - Keşke Alsaydım? */}
        <GlassCard className="p-6 bg-gradient-to-br from-primary/20 to-secondary/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-white/80 font-medium">Hızlı İşlem</span>
            </div>
            <p className="text-white/60 text-sm mb-4">
              İki hisseyi karşılaştır ve fırsatları keşfet
            </p>
            <Link to="/compare">
              <Button variant="gradient" className="w-full group">
                Keşke Alsaydım?
                <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </GlassCard>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <MarketSection loading={loading} quotes={keyQuotes} />
          <TopPerformersSection loading={loading} performers={topPerformers} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <AllocationSection loading={loading} allocation={allocation} />
          <RecentSection loading={loading} recent={recentInvestments} />
        </div>
      </div>
    </motion.div>
  );
}

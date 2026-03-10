import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Trash2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShimmerCard, ShimmerRow, ShimmerProgress } from '@/components/ui/skeleton';
import { formatCurrency, formatPercent, getChangeColor, cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { portfolioService } from '@/services/portfolioService';
import type { Investment, PortfolioSummary, AddInvestmentRequest } from '@/types';
import { toast } from 'sonner';
import CountUp from 'react-countup';

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

const ALLOCATION_COLORS = [
  'from-primary to-primary',
  'from-secondary to-secondary',
  'from-success to-success',
  'from-purple-500 to-purple-500',
  'from-orange-500 to-orange-500',
  'from-pink-500 to-pink-500',
  'from-teal-500 to-teal-500',
];

const emptyForm: AddInvestmentRequest = {
  symbol: '',
  symbolName: '',
  exchange: '',
  quantity: 0,
  buyPrice: 0,
  buyDate: new Date().toISOString().split('T')[0],
  notes: '',
};

// ── Premium Loading ──────────────────────────────────────────────────────────

function PortfolioLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Pulse bar shimmer */}
      <div className="skeleton-shimmer rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="w-24 h-3 rounded-lg skeleton-shimmer" />
            <div className="w-40 h-5 rounded-lg skeleton-shimmer" />
          </div>
          <div className="flex gap-2">
            <div className="w-20 h-6 rounded-full skeleton-shimmer" />
            <div className="w-16 h-6 rounded-full skeleton-shimmer" />
          </div>
        </div>
        <div className="w-full h-3 rounded-full skeleton-shimmer" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <ShimmerCard key={`pf-card-${i}`} />
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="skeleton-shimmer rounded-2xl p-6 space-y-4">
            <div className="w-24 h-5 rounded-lg skeleton-shimmer" />
            {Array.from({ length: 5 }, (_, i) => (
              <ShimmerRow key={`pf-row-${i}`} />
            ))}
          </div>
        </div>
        <div className="skeleton-shimmer rounded-2xl p-6 space-y-4">
          <div className="w-32 h-5 rounded-lg skeleton-shimmer" />
          {Array.from({ length: 4 }, (_, i) => (
            <ShimmerProgress key={`pf-prog-${i}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Holdings table sub-component ──────────────────────────────────────────────

interface HoldingsTableProps {
  readonly holdings: Investment[];
  readonly deletingId: string | null;
  readonly onDelete: (id: string, symbol: string) => void;
  readonly onAddClick: () => void;
}

function HoldingsTable({ holdings, deletingId, onDelete, onAddClick }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-5 border border-white/[0.06]">
          <Wallet className="w-10 h-10 text-white/15" />
        </div>
        <p className="text-white/50 mb-1 font-medium">Portfolyunuzde henuz yatirim yok</p>
        <p className="text-white/30 text-sm mb-5">Ilk yatiriminizi ekleyerek baslayin</p>
        <Button variant="gradient" size="sm" onClick={onAddClick}>
          <Plus className="w-4 h-4 mr-2" />
          Ilk Yatirimi Ekle
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-white/35 text-xs uppercase tracking-wider border-b border-white/[0.06]">
            <th className="pb-4 font-medium">Hisse</th>
            <th className="pb-4 font-medium hidden md:table-cell">Miktar</th>
            <th className="pb-4 font-medium hidden md:table-cell">Alis</th>
            <th className="pb-4 font-medium">Guncel</th>
            <th className="pb-4 font-medium text-right">Kar/Zarar</th>
            <th className="pb-4 font-medium w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {holdings.map((holding, index) => (
            <HoldingRow
              key={holding.id}
              holding={holding}
              index={index}
              isDeleting={deletingId === holding.id}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Single holding row ────────────────────────────────────────────────────────

interface HoldingRowProps {
  readonly holding: Investment;
  readonly index: number;
  readonly isDeleting: boolean;
  readonly onDelete: (id: string, symbol: string) => void;
}

function HoldingRow({ holding, index, isDeleting, onDelete }: HoldingRowProps) {
  const isPositive = holding.changePercent >= 0;
  const isProfitable = holding.profit >= 0;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="hover:bg-white/[0.03] transition-colors group"
    >
      <td className="py-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ring-1',
            isPositive ? 'bg-success/15 ring-success/20' : 'bg-danger/15 ring-danger/20',
          )}>
            {isPositive
              ? <TrendingUp className="w-5 h-5 text-success" />
              : <TrendingDown className="w-5 h-5 text-danger" />
            }
          </div>
          <div>
            <p className="font-semibold text-white">{holding.symbol}</p>
            <p className="text-xs text-white/35">{holding.symbolName}</p>
          </div>
        </div>
      </td>
      <td className="py-4 text-white/80 hidden md:table-cell font-mono text-sm">
        {holding.quantity.toLocaleString('tr-TR')}
      </td>
      <td className="py-4 text-white/50 hidden md:table-cell text-sm">
        {formatCurrency(holding.buyPrice)}
      </td>
      <td className="py-4">
        <div>
          <span className="text-white font-medium text-sm number-ticker">{formatCurrency(holding.currentPrice)}</span>
          <div className={cn('text-xs flex items-center gap-1 mt-0.5', getChangeColor(holding.changePercent))}>
            {isPositive
              ? <ArrowUpRight className="w-3 h-3" />
              : <ArrowDownRight className="w-3 h-3" />
            }
            {formatPercent(Math.abs(holding.changePercent))}
          </div>
        </div>
      </td>
      <td className="py-4 text-right">
        <p className={cn('font-semibold text-sm number-ticker', getChangeColor(holding.profit))}>
          {isProfitable ? '+' : ''}{formatCurrency(holding.profit)}
        </p>
        <Badge variant={isProfitable ? 'success' : 'danger'} size="sm" className="mt-1">
          {formatPercent(holding.profitPercent)}
        </Badge>
      </td>
      <td className="py-4">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-white/45 hover:text-danger md:opacity-0 md:group-hover:opacity-100 transition-all"
          onClick={() => onDelete(holding.id, holding.symbol)}
          disabled={isDeleting}
          title="Sil"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </td>
    </motion.tr>
  );
}

// ── Allocation panel sub-component ────────────────────────────────────────────

interface AllocationPanelProps {
  readonly holdings: Investment[];
  readonly totalValue: number;
}

function AllocationPanel({ holdings, totalValue }: AllocationPanelProps) {
  const sorted = [...holdings].sort((a, b) => b.weight - a.weight);

  if (sorted.length === 0) {
    return <p className="text-white/35 text-sm text-center py-8">Henuz varlik yok</p>;
  }

  return (
    <>
      {sorted.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.08 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full bg-gradient-to-r', ALLOCATION_COLORS[index % ALLOCATION_COLORS.length])} />
              <span className="text-white font-medium">{item.symbol}</span>
            </div>
            <div className="text-right">
              <span className="text-white/50 font-mono text-xs">{item.weight.toFixed(1)}%</span>
              <span className="text-white/30 text-xs ml-2">({formatCurrency(item.currentValue)})</span>
            </div>
          </div>
          <Progress value={item.weight} variant="gradient" size="sm" />
        </motion.div>
      ))}

      <div className="pt-4 mt-4 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">Toplam</span>
          <span className="text-white font-bold number-ticker">{formatCurrency(totalValue)}</span>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<AddInvestmentRequest>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPortfolio = useCallback(async () => {
    try {
      const data = await portfolioService.getPortfolio();
      setPortfolio(data);
    } catch {
      toast.error('Portfoy verileri yuklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPortfolio(); }, [loadPortfolio]);

  const handleFormChange = (field: keyof AddInvestmentRequest, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const symbol = formData.symbol.toUpperCase();
      await portfolioService.addInvestment({
        ...formData,
        symbol,
        quantity: Number(formData.quantity),
        buyPrice: Number(formData.buyPrice),
      });
      toast.success(`${symbol} portfolye eklendi.`);
      setShowForm(false);
      setFormData(emptyForm);
      setLoading(true);
      await loadPortfolio();
    } catch {
      toast.error('Yatirim eklenirken hata olustu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, symbol: string) => {
    setDeletingId(id);
    try {
      await portfolioService.deleteInvestment(id);
      toast.success(`${symbol} portfolyden silindi.`);
      setLoading(true);
      await loadPortfolio();
    } catch {
      toast.error('Yatirim silinirken hata olustu.');
    } finally {
      setDeletingId(null);
    }
  };

  const holdings = portfolio?.holdings ?? [];
  const gainers = holdings.filter(h => h.changePercent > 0).length;
  const losers  = holdings.filter(h => h.changePercent < 0).length;
  const neutral = holdings.filter(h => h.changePercent === 0).length;
  const totalPositions = holdings.length || 1;
  const positiveRatio = (gainers / totalPositions) * 100;
  const negativeRatio = (losers / totalPositions) * 100;

  return (
    <motion.div
      className="space-y-6 rounded-3xl border border-white/[0.06] bg-[linear-gradient(145deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))] p-3 md:p-4 shadow-[0_28px_90px_-62px_rgba(16,185,129,0.82)]"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Portfolyum</h1>
          <p className="text-white/50 text-sm">Yatirimlarini takip et ve yonet</p>
        </div>
        <Button variant="gradient" onClick={() => setShowForm(prev => !prev)}>
          {showForm
            ? <><X className="w-4 h-4 mr-2" />Vazgec</>
            : <><Plus className="w-4 h-4 mr-2" />Yeni Yatirim</>
          }
        </Button>
      </motion.div>

      {/* Portfolio Pulse Bar */}
      {!loading && holdings.length > 0 && (
        <motion.div variants={fadeInUp}>
          <GlassCard className="p-5 md:p-6 relative overflow-hidden border-breathing">
            <div className="absolute -top-20 -right-14 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-secondary/15 blur-3xl" />
            <div className="relative">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-[0.14em]">Portfoy Pulse</p>
                  <p className="text-white font-semibold text-lg mt-1">Acik pozisyon dagilimi</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">{gainers} yukselen</Badge>
                  <Badge variant="danger">{losers} dusen</Badge>
                  <Badge variant="outline">{neutral} yatay</Badge>
                </div>
              </div>

              <div className="mt-4 h-3 rounded-full overflow-hidden bg-white/[0.06] flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${positiveRatio}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full bg-gradient-to-r from-success to-success/80"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((neutral) / totalPositions) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.06 }}
                  className="h-full bg-white/20"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${negativeRatio}%` }}
                  transition={{ duration: 0.8, delay: 0.12 }}
                  className="h-full bg-gradient-to-r from-danger/80 to-danger"
                />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Inline Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Yeni Yatirim Ekle
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="symbol" className="text-white/70">
                      Sembol <span className="text-danger">*</span>
                    </Label>
                    <Input
                      id="symbol"
                      placeholder="orn. THYAO"
                      value={formData.symbol}
                      onChange={e => handleFormChange('symbol', e.target.value.toUpperCase())}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 uppercase"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbolName" className="text-white/70">Sirket Adi</Label>
                    <Input
                      id="symbolName"
                      placeholder="orn. Turk Hava Yollari"
                      value={formData.symbolName}
                      onChange={e => handleFormChange('symbolName', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-white/70">
                      Miktar <span className="text-danger">*</span>
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="orn. 100"
                      value={formData.quantity || ''}
                      onChange={e => handleFormChange('quantity', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buyPrice" className="text-white/70">
                      Alis Fiyati (₺) <span className="text-danger">*</span>
                    </Label>
                    <Input
                      id="buyPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="orn. 280.50"
                      value={formData.buyPrice || ''}
                      onChange={e => handleFormChange('buyPrice', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buyDate" className="text-white/70">
                      Alis Tarihi <span className="text-danger">*</span>
                    </Label>
                    <Input
                      id="buyDate"
                      type="date"
                      value={formData.buyDate}
                      onChange={e => handleFormChange('buyDate', e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-white/70">Not</Label>
                    <Input
                      id="notes"
                      placeholder="Istege bagli not..."
                      value={formData.notes}
                      onChange={e => handleFormChange('notes', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-white/60 hover:text-white"
                    onClick={() => { setShowForm(false); setFormData(emptyForm); }}
                  >
                    Iptal
                  </Button>
                  <Button type="submit" variant="gradient" disabled={submitting}>
                    {submitting ? 'Ekleniyor...' : 'Yatirimi Ekle'}
                  </Button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <PortfolioLoadingSkeleton />
      ) : (
        <>
          {/* Summary Cards */}
          <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Value */}
            <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 card-glow-green">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/20">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  {portfolio && (
                    <Badge variant={portfolio.totalProfitPercent >= 0 ? 'success' : 'danger'}>
                      {formatPercent(portfolio.totalProfitPercent)}
                    </Badge>
                  )}
                </div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Toplam Deger</p>
                <p className="text-2xl md:text-3xl font-bold text-white number-ticker">
                  <CountUp end={portfolio?.totalValue ?? 0} prefix="₺" separator="." decimals={2} decimal="," duration={1.2} />
                </p>
              </div>
            </GlassCard>

            {/* Total Cost */}
            <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 card-glow-blue">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center ring-1 ring-secondary/20">
                    <PiggyBank className="w-6 h-6 text-secondary" />
                  </div>
                </div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Toplam Maliyet</p>
                <p className="text-2xl md:text-3xl font-bold text-white number-ticker">
                  <CountUp end={portfolio?.totalCost ?? 0} prefix="₺" separator="." decimals={2} decimal="," duration={1.2} />
                </p>
              </div>
            </GlassCard>

            {/* Total Profit */}
            <GlassCard className={cn(
              'p-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300',
              (portfolio?.totalProfit ?? 0) >= 0 ? 'card-glow-green' : 'card-glow-red',
            )}>
              <div className={cn(
                'absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500',
                (portfolio?.totalProfit ?? 0) >= 0 ? 'from-success/10' : 'from-danger/10',
              )} />
              <div className="relative">
                <div className="mb-4">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center ring-1',
                    (portfolio?.totalProfit ?? 0) >= 0 ? 'bg-success/20 ring-success/20' : 'bg-danger/20 ring-danger/20',
                  )}>
                    {(portfolio?.totalProfit ?? 0) >= 0
                      ? <TrendingUp className="w-6 h-6 text-success" />
                      : <TrendingDown className="w-6 h-6 text-danger" />
                    }
                  </div>
                </div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Toplam Kar/Zarar</p>
                <p className={cn('text-2xl md:text-3xl font-bold number-ticker', getChangeColor(portfolio?.totalProfit ?? 0))}>
                  {(portfolio?.totalProfit ?? 0) >= 0 ? '+' : '-'}₺
                  <CountUp end={Math.abs(portfolio?.totalProfit ?? 0)} separator="." decimals={2} decimal="," duration={1.2} />
                </p>
              </div>
            </GlassCard>

            {/* Performance */}
            <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 card-glow-gold">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500/20">
                    <Target className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Performans</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="w-4 h-4 text-success" />
                    <span className="text-success font-bold">{gainers}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ArrowDownRight className="w-4 h-4 text-danger" />
                    <span className="text-danger font-bold">{losers}</span>
                  </div>
                </div>
                <p className="text-white/30 text-xs mt-2">{portfolio?.openInvestments ?? 0} acik yatirim</p>
              </div>
            </GlassCard>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Holdings Table */}
            <motion.div variants={fadeInUp} className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Varliklar
                  </CardTitle>
                  <span className="text-white/35 text-xs font-mono">{holdings.length} hisse</span>
                </CardHeader>
                <CardContent>
                  <HoldingsTable
                    holdings={holdings}
                    deletingId={deletingId}
                    onDelete={handleDelete}
                    onAddClick={() => setShowForm(true)}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Portfolio Allocation */}
            <motion.div variants={fadeInUp}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Portfoy Dagilimi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AllocationPanel holdings={holdings} totalValue={portfolio?.totalValue ?? 0} />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
}

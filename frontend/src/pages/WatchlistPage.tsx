import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Star,
  TrendingUp,
  TrendingDown,
  Search,
  LayoutGrid,
  List,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ShimmerCard } from '@/components/ui/skeleton';
import { formatCurrency, formatPercent, formatCompact, cn } from '@/lib/utils';
import { useState, useMemo, useEffect } from 'react';
import { useWatchlist, useAddWatchlistItem, useRemoveWatchlistItem } from '@/hooks/useQueries';
import type { WatchlistItem } from '@/types';
import { toast } from 'sonner';
import CountUp from 'react-countup';
import { getApiErrorMessage } from '@/lib/api-error';

// ── Animation variants ────────────────────────────────────────────────────────

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pricePosition(item: WatchlistItem): number {
  const range = item.week52High - item.week52Low;
  if (range === 0) return 50;
  return Math.min(100, Math.max(0, ((item.price - item.week52Low) / range) * 100));
}

// ── Premium Loading ──────────────────────────────────────────────────────────

function WatchlistLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={`wl-stat-${i}`} className="skeleton-shimmer rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
              <div className="space-y-2">
                <div className="w-20 h-3 rounded-lg skeleton-shimmer" />
                <div className="w-10 h-5 rounded-lg skeleton-shimmer" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <ShimmerCard key={`wl-card-${i}`} />
        ))}
      </div>
    </div>
  );
}

// ── Watchlist card (grid view) ────────────────────────────────────────────────

interface WatchlistCardProps {
  readonly item: WatchlistItem;
  readonly index: number;
  readonly isRemoving: boolean;
  readonly onRemove: (id: string, symbol: string) => void;
}

function WatchlistCard({ item, index, isRemoving, onRemove }: WatchlistCardProps) {
  const pos = pricePosition(item);
  const isUp = item.changePercent >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassCard className={cn(
        'p-6 hover:scale-[1.02] transition-all duration-300 cursor-pointer group relative overflow-hidden',
        isUp ? 'card-glow-green' : 'card-glow-red',
      )}>
        <div className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br',
          isUp ? 'from-success/5 to-transparent' : 'from-danger/5 to-transparent',
        )} />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ring-1',
                isUp ? 'bg-success/15 ring-success/20' : 'bg-danger/15 ring-danger/20',
              )}>
                {isUp
                  ? <TrendingUp className="w-6 h-6 text-success" />
                  : <TrendingDown className="w-6 h-6 text-danger" />
                }
              </div>
              <div>
                <p className="font-semibold text-white">{item.symbol}</p>
                <p className="text-xs text-white/35">{item.symbolName}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 shrink-0 text-white/45 hover:text-danger md:opacity-0 md:group-hover:opacity-100 transition-all"
              onClick={() => onRemove(item.id, item.symbol)}
              disabled={isRemoving}
              title="Listeden cikar"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="mb-4">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white number-ticker">
                <CountUp end={item.price} prefix="₺" decimals={2} decimal="," separator="." duration={0.5} />
              </span>
              <Badge variant={isUp ? 'success' : 'danger'}>
                <span className="flex items-center gap-1">
                  {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {formatPercent(Math.abs(item.changePercent))}
                </span>
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
              <span className="text-white/35">52H Min</span>
              <span className="text-white/35">52H Max</span>
            </div>
            <div className="relative">
              <Progress value={pos} variant="gradient" size="sm" />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-primary shadow-lg shadow-primary/30 pointer-events-none"
                style={{ left: `calc(${pos}% - 6px)` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50 font-mono">{formatCurrency(item.week52Low)}</span>
              <span className="text-white/50 font-mono">{formatCurrency(item.week52High)}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-white/35 text-[10px] uppercase tracking-wider">Hacim</span>
            <span className="text-white/60 text-sm font-medium number-ticker">{formatCompact(item.volume)}</span>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ── Watchlist list view ───────────────────────────────────────────────────────

interface WatchlistListViewProps {
  readonly items: WatchlistItem[];
  readonly removingId: string | null;
  readonly onRemove: (id: string, symbol: string) => void;
}

function WatchlistListView({ items, removingId, onRemove }: WatchlistListViewProps) {
  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Takip Listesi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-white/35 text-xs uppercase tracking-wider border-b border-white/[0.06]">
                  <th className="pb-4 font-medium">Hisse</th>
                  <th className="pb-4 font-medium">Fiyat</th>
                  <th className="pb-4 font-medium">Degisim</th>
                  <th className="pb-4 font-medium hidden md:table-cell">52H Aralik</th>
                  <th className="pb-4 font-medium hidden md:table-cell">Hacim</th>
                  <th className="pb-4 font-medium text-right w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {items.map((stock, index) => {
                  const pos = pricePosition(stock);
                  const isUp = stock.changePercent >= 0;
                  return (
                    <motion.tr
                      key={stock.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center ring-1 transition-transform group-hover:scale-110',
                            isUp ? 'bg-success/15 ring-success/20' : 'bg-danger/15 ring-danger/20',
                          )}>
                            {isUp
                              ? <TrendingUp className="w-5 h-5 text-success" />
                              : <TrendingDown className="w-5 h-5 text-danger" />
                            }
                          </div>
                          <div>
                            <p className="font-semibold text-white">{stock.symbol}</p>
                            <p className="text-xs text-white/35">{stock.symbolName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-white font-medium number-ticker">{formatCurrency(stock.price)}</span>
                      </td>
                      <td className="py-4">
                        <Badge variant={isUp ? 'success' : 'danger'}>
                          {formatPercent(stock.changePercent)}
                        </Badge>
                      </td>
                      <td className="py-4 hidden md:table-cell">
                        <div className="w-32">
                          <Progress value={pos} variant="gradient" size="sm" />
                          <div className="flex justify-between text-[10px] text-white/35 mt-1 font-mono">
                            <span>{formatCurrency(stock.week52Low)}</span>
                            <span>{formatCurrency(stock.week52High)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-white/50 hidden md:table-cell text-sm number-ticker">
                        {formatCompact(stock.volume)}
                      </td>
                      <td className="py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-white/45 hover:text-danger md:opacity-0 md:group-hover:opacity-100 transition-all"
                          onClick={() => onRemove(stock.id, stock.symbol)}
                          disabled={removingId === stock.id}
                          title="Listeden cikar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Items view ────────────────────────────────────────────────────────────────

interface ItemsViewProps {
  readonly viewMode: 'grid' | 'list';
  readonly filtered: WatchlistItem[];
  readonly removingId: string | null;
  readonly onRemove: (id: string, symbol: string) => void;
}

function ItemsView({ viewMode, filtered, removingId, onRemove }: ItemsViewProps) {
  if (viewMode === 'grid') {
    return (
      <AnimatePresence mode="popLayout">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, index) => (
            <WatchlistCard key={item.id} item={item} index={index} isRemoving={removingId === item.id} onRemove={onRemove} />
          ))}
        </div>
      </AnimatePresence>
    );
  }
  return (
    <AnimatePresence mode="popLayout">
      <WatchlistListView items={filtered} removingId={removingId} onRemove={onRemove} />
    </AnimatePresence>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const { data: watchlist = [], isLoading: loading, error: queryError } = useWatchlist();
  const addWatchlistItem = useAddWatchlistItem();
  const removeWatchlistItem = useRemoveWatchlistItem();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');

  useEffect(() => {
    if (queryError) {
      toast.error(getApiErrorMessage(queryError, 'Izleme listesi yuklenemedi.'));
    }
  }, [queryError]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) return;
    if (watchlist.some((item) => item.symbol.toUpperCase() === symbol)) {
      toast.error('Bu hisse zaten izleme listenizde.');
      return;
    }
    addWatchlistItem.mutate(
      { symbol },
      {
        onSuccess: () => {
          toast.success(`${symbol} izleme listesine eklendi.`);
          setNewSymbol('');
          setShowAddForm(false);
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Hisse eklenirken hata olustu.'));
        },
      },
    );
  };

  const handleRemove = (id: string, symbol: string) => {
    removeWatchlistItem.mutate(id, {
      onSuccess: () => {
        toast.success(`${symbol} listeden cikarildi.`);
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, 'Hisse cikarilirken hata olustu.'));
      },
    });
  };

  const filtered = useMemo(
    () => watchlist.filter(
      s => s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.symbolName.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
    [watchlist, searchQuery],
  );

  const { gainers, losers, unchanged, topGainer, topLoser } = useMemo(() => {
    const g = watchlist.filter(s => s.changePercent > 0).length;
    const l = watchlist.filter(s => s.changePercent < 0).length;
    const u = watchlist.filter(s => s.changePercent === 0).length;
    const sortedByMomentum = [...watchlist].sort((a, b) => b.changePercent - a.changePercent);
    return {
      gainers: g,
      losers: l,
      unchanged: u,
      topGainer: sortedByMomentum[0] as WatchlistItem | undefined,
      topLoser: [...watchlist].sort((a, b) => a.changePercent - b.changePercent)[0] as WatchlistItem | undefined,
    };
  }, [watchlist]);

  const removingId = removeWatchlistItem.isPending ? (removeWatchlistItem.variables ?? null) : null;

  return (
    <motion.div
      className="space-y-6 rounded-3xl border border-white/[0.06] bg-[linear-gradient(145deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))] p-3 md:p-4 shadow-[0_28px_90px_-62px_rgba(234,179,8,0.72)]"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <Star className="w-7 h-7 text-yellow-500" />
            Favorilerim
          </h1>
          <p className="text-white/50 text-sm">Takip ettigin hisseleri izle</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
            <Input placeholder="Hisse ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 w-full md:w-56 bg-white/5 border-white/10" />
          </div>
          <div className="flex rounded-lg bg-white/[0.04] p-1 border border-white/[0.06]">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="gradient" onClick={() => setShowAddForm(prev => !prev)}>
            {showAddForm ? <><X className="w-4 h-4 mr-2" />Vazgec</> : <><Plus className="w-4 h-4 mr-2" />Hisse Ekle</>}
          </Button>
        </div>
      </motion.div>

      {/* Leader/Loser highlight */}
      {!loading && watchlist.length > 0 && (
        <motion.div variants={fadeInUp}>
          <GlassCard className="p-5 md:p-6 relative overflow-hidden border-breathing">
            <div className="absolute -top-20 -left-10 h-36 w-36 rounded-full bg-success/15 blur-3xl" />
            <div className="absolute -bottom-16 right-4 h-40 w-40 rounded-full bg-danger/10 blur-3xl" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-success/20 bg-success/[0.06] p-4 hover:bg-success/10 transition-colors card-glow-green">
                <p className="text-[10px] text-success/70 uppercase tracking-[0.12em] mb-1">Gunun Lideri</p>
                <p className="text-white font-semibold text-lg">{topGainer?.symbol ?? '-'}</p>
                <p className="text-success text-sm font-medium mt-1">{topGainer ? formatPercent(topGainer.changePercent) : '-'}</p>
              </div>
              <div className="rounded-xl border border-danger/20 bg-danger/[0.06] p-4 hover:bg-danger/10 transition-colors card-glow-red">
                <p className="text-[10px] text-danger/70 uppercase tracking-[0.12em] mb-1">Zayif Halka</p>
                <p className="text-white font-semibold text-lg">{topLoser?.symbol ?? '-'}</p>
                <p className="text-danger text-sm font-medium mt-1">{topLoser ? formatPercent(topLoser.changePercent) : '-'}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Inline add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div key="add-symbol-form" initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} transition={{ duration: 0.25 }}>
            <GlassCard className="p-5">
              <form onSubmit={handleAdd} className="flex items-end gap-3">
                <div className="flex-1 max-w-xs space-y-2">
                  <label htmlFor="new-symbol" className="text-white/60 text-sm font-medium">Sembol</label>
                  <Input id="new-symbol" placeholder="orn. THYAO" value={newSymbol} onChange={e => setNewSymbol(e.target.value.toUpperCase())} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 uppercase" autoFocus required />
                </div>
                <Button type="submit" variant="gradient" disabled={addWatchlistItem.isPending || !newSymbol.trim()}>{addWatchlistItem.isPending ? 'Ekleniyor...' : 'Ekle'}</Button>
                <Button type="button" variant="ghost" className="text-white/60 hover:text-white" onClick={() => { setShowAddForm(false); setNewSymbol(''); }}>Iptal</Button>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <WatchlistLoadingSkeleton />
      ) : (
        <>
          {/* Stats row */}
          <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="p-4 card-glow-gold">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center ring-1 ring-yellow-500/20"><Star className="w-5 h-5 text-yellow-500" /></div>
                <div><p className="text-white/50 text-[10px] uppercase tracking-wider">Takip Edilen</p><p className="text-xl font-bold text-white">{watchlist.length}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4 card-glow-green">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center ring-1 ring-success/20"><TrendingUp className="w-5 h-5 text-success" /></div>
                <div><p className="text-white/50 text-[10px] uppercase tracking-wider">Yukselenler</p><p className="text-xl font-bold text-success">{gainers}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4 card-glow-red">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-danger/15 flex items-center justify-center ring-1 ring-danger/20"><TrendingDown className="w-5 h-5 text-danger" /></div>
                <div><p className="text-white/50 text-[10px] uppercase tracking-wider">Dusenler</p><p className="text-xl font-bold text-danger">{losers}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center ring-1 ring-white/10"><ArrowUpRight className="w-5 h-5 text-white/50" /></div>
                <div><p className="text-white/50 text-[10px] uppercase tracking-wider">Degismeyenler</p><p className="text-xl font-bold text-white">{unchanged}</p></div>
              </div>
            </GlassCard>
          </motion.div>

          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-6 border border-white/[0.06]">
                <Search className="w-10 h-10 text-white/15" />
              </div>
              {searchQuery ? (
                <><h3 className="text-xl font-semibold text-white mb-2">Sonuc bulunamadi</h3><p className="text-white/50 text-center max-w-sm text-sm">"{searchQuery}" icin eslesen hisse bulunamadi</p></>
              ) : (
                <><h3 className="text-xl font-semibold text-white mb-2">Izleme listeniz bos</h3><p className="text-white/50 text-center max-w-sm mb-4 text-sm">Takip etmek istediginiz hisseleri ekleyin</p><Button variant="gradient" onClick={() => setShowAddForm(true)}><Plus className="w-4 h-4 mr-2" />Hisse Ekle</Button></>
              )}
            </motion.div>
          ) : (
            <ItemsView viewMode={viewMode} filtered={filtered} removingId={removingId} onRemove={handleRemove} />
          )}
        </>
      )}
    </motion.div>
  );
}

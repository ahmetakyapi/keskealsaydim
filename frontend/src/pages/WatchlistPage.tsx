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
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatPercent, formatCompact, cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { watchlistService } from '@/services/watchlistService';
import type { WatchlistItem } from '@/types';
import { toast } from 'sonner';
import CountUp from 'react-countup';

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

const CARD_SKELETON_IDS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
const STAT_SKELETON_IDS = ['st1', 'st2', 'st3', 'st4'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pricePosition(item: WatchlistItem): number {
  const range = item.week52High - item.week52Low;
  if (range === 0) return 50;
  return Math.min(100, Math.max(0, ((item.price - item.week52Low) / range) * 100));
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function WatchlistSkeletons() {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_SKELETON_IDS.map(id => (
          <GlassCard key={id} className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-10 h-5" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARD_SKELETON_IDS.map(id => (
          <GlassCard key={id} className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="w-20 h-4" />
                <Skeleton className="w-32 h-3" />
              </div>
              <Skeleton className="w-16 h-6 rounded-full" />
            </div>
            <Skeleton className="w-28 h-8" />
            <Skeleton className="w-full h-2 rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="w-16 h-3" />
              <Skeleton className="w-16 h-3" />
            </div>
          </GlassCard>
        ))}
      </div>
    </>
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
    >
      <GlassCard className="p-6 hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden">
        <div className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br',
          isUp ? 'from-success/5 to-transparent' : 'from-danger/5 to-transparent',
        )} />

        <div className="relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110',
                isUp ? 'bg-success/20' : 'bg-danger/20',
              )}>
                {isUp
                  ? <TrendingUp className="w-6 h-6 text-success" />
                  : <TrendingDown className="w-6 h-6 text-danger" />
                }
              </div>
              <div>
                <p className="font-semibold text-white">{item.symbol}</p>
                <p className="text-xs text-white/40">{item.symbolName}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/20 hover:text-danger opacity-0 group-hover:opacity-100 transition-all w-8 h-8 shrink-0"
              onClick={() => onRemove(item.id, item.symbol)}
              disabled={isRemoving}
              title="Listeden çıkar"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Price */}
          <div className="mb-4">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white">
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

          {/* 52-week range */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">52H Min</span>
              <span className="text-white/40">52H Max</span>
            </div>
            <div className="relative">
              <Progress value={pos} variant="gradient" size="sm" />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-primary shadow-lg pointer-events-none"
                style={{ left: `calc(${pos}% - 6px)` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">{formatCurrency(item.week52Low)}</span>
              <span className="text-white/60">{formatCurrency(item.week52High)}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-white/40 text-xs">Hacim</span>
            <span className="text-white/60 text-sm font-medium">{formatCompact(item.volume)}</span>
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
                <tr className="text-left text-white/40 text-sm border-b border-white/10">
                  <th className="pb-4 font-medium">Hisse</th>
                  <th className="pb-4 font-medium">Fiyat</th>
                  <th className="pb-4 font-medium">Değişim</th>
                  <th className="pb-4 font-medium hidden md:table-cell">52H Aralık</th>
                  <th className="pb-4 font-medium hidden md:table-cell">Hacim</th>
                  <th className="pb-4 font-medium text-right w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((stock, index) => {
                  const pos = pricePosition(stock);
                  const isUp = stock.changePercent >= 0;

                  return (
                    <motion.tr
                      key={stock.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center',
                            isUp ? 'bg-success/20' : 'bg-danger/20',
                          )}>
                            {isUp
                              ? <TrendingUp className="w-5 h-5 text-success" />
                              : <TrendingDown className="w-5 h-5 text-danger" />
                            }
                          </div>
                          <div>
                            <p className="font-semibold text-white">{stock.symbol}</p>
                            <p className="text-xs text-white/40">{stock.symbolName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-white font-medium">{formatCurrency(stock.price)}</span>
                      </td>
                      <td className="py-4">
                        <Badge variant={isUp ? 'success' : 'danger'}>
                          {formatPercent(stock.changePercent)}
                        </Badge>
                      </td>
                      <td className="py-4 hidden md:table-cell">
                        <div className="w-32">
                          <Progress value={pos} variant="gradient" size="sm" />
                          <div className="flex justify-between text-xs text-white/40 mt-1">
                            <span>{formatCurrency(stock.week52Low)}</span>
                            <span>{formatCurrency(stock.week52High)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-white/60 hidden md:table-cell">
                        {formatCompact(stock.volume)}
                      </td>
                      <td className="py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white/20 hover:text-danger opacity-0 group-hover:opacity-100 transition-all w-8 h-8"
                          onClick={() => onRemove(stock.id, stock.symbol)}
                          disabled={removingId === stock.id}
                          title="Listeden çıkar"
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

// ── Items view (grid or list) ─────────────────────────────────────────────────

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
            <WatchlistCard
              key={item.id}
              item={item}
              index={index}
              isRemoving={removingId === item.id}
              onRemove={onRemove}
            />
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
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadWatchlist = useCallback(async () => {
    try {
      const data = await watchlistService.getWatchlist();
      setWatchlist(data);
    } catch {
      toast.error('İzleme listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWatchlist(); }, [loadWatchlist]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) return;
    setAdding(true);
    try {
      await watchlistService.addSymbol(symbol);
      toast.success(`${symbol} izleme listesine eklendi.`);
      setNewSymbol('');
      setShowAddForm(false);
      setLoading(true);
      await loadWatchlist();
    } catch {
      toast.error('Hisse eklenirken hata oluştu.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string, symbol: string) => {
    // Optimistic removal
    setRemovingId(id);
    setWatchlist(prev => prev.filter(item => item.id !== id));
    try {
      await watchlistService.removeSymbol(id);
      toast.success(`${symbol} listeden çıkarıldı.`);
    } catch {
      toast.error('Hisse çıkarılırken hata oluştu.');
      await loadWatchlist(); // revert on error
    } finally {
      setRemovingId(null);
    }
  };

  const filtered = watchlist.filter(
    s =>
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.symbolName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const gainers   = watchlist.filter(s => s.changePercent > 0).length;
  const losers    = watchlist.filter(s => s.changePercent < 0).length;
  const unchanged = watchlist.filter(s => s.changePercent === 0).length;

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <Star className="w-7 h-7 text-yellow-500" />
            Favorilerim
          </h1>
          <p className="text-white/60">Takip ettiğin hisseleri izle</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Hisse ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 w-full md:w-56 bg-white/5 border-white/10"
            />
          </div>

          {/* View mode toggle */}
          <div className="flex rounded-lg bg-white/5 p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Add button */}
          <Button variant="gradient" onClick={() => setShowAddForm(prev => !prev)}>
            {showAddForm
              ? <><X className="w-4 h-4 mr-2" />Vazgeç</>
              : <><Plus className="w-4 h-4 mr-2" />Hisse Ekle</>
            }
          </Button>
        </div>
      </motion.div>

      {/* Inline add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            key="add-symbol-form"
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <GlassCard className="p-5">
              <form onSubmit={handleAdd} className="flex items-end gap-3">
                <div className="flex-1 max-w-xs space-y-2">
                  <label htmlFor="new-symbol" className="text-white/70 text-sm font-medium">
                    Sembol
                  </label>
                  <Input
                    id="new-symbol"
                    placeholder="örn. THYAO"
                    value={newSymbol}
                    onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 uppercase"
                    autoFocus
                    required
                  />
                </div>
                <Button type="submit" variant="gradient" disabled={adding || !newSymbol.trim()}>
                  {adding ? 'Ekleniyor...' : 'Ekle'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-white/60 hover:text-white"
                  onClick={() => { setShowAddForm(false); setNewSymbol(''); }}
                >
                  İptal
                </Button>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <WatchlistSkeletons />
      ) : (
        <>
          {/* Stats row */}
          <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-white/60 text-xs">Takip Edilen</p>
                  <p className="text-xl font-bold text-white">{watchlist.length}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-white/60 text-xs">Yükselenler</p>
                  <p className="text-xl font-bold text-success">{gainers}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-danger" />
                </div>
                <div>
                  <p className="text-white/60 text-xs">Düşenler</p>
                  <p className="text-xl font-bold text-danger">{losers}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-white/60" />
                </div>
                <div>
                  <p className="text-white/60 text-xs">Değişmeyenler</p>
                  <p className="text-xl font-bold text-white">{unchanged}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Content */}
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-white/20" />
              </div>
              {searchQuery ? (
                <>
                  <h3 className="text-xl font-semibold text-white mb-2">Sonuç bulunamadı</h3>
                  <p className="text-white/60 text-center max-w-sm">
                    "{searchQuery}" için eşleşen hisse bulunamadı
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-white mb-2">İzleme listeniz boş</h3>
                  <p className="text-white/60 text-center max-w-sm mb-4">
                    Takip etmek istediğiniz hisseleri ekleyin
                  </p>
                  <Button variant="gradient" onClick={() => setShowAddForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Hisse Ekle
                  </Button>
                </>
              )}
            </motion.div>
          ) : (
            <ItemsView
              viewMode={viewMode}
              filtered={filtered}
              removingId={removingId}
              onRemove={handleRemove}
            />
          )}
        </>
      )}
    </motion.div>
  );
}

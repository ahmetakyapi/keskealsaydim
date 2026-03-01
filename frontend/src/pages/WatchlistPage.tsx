import { motion } from 'framer-motion';
import {
  Plus,
  Star,
  Bell,
  TrendingUp,
  TrendingDown,
  Search,
  LayoutGrid,
  List,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  BellRing
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatPercent, getChangeColor, cn } from '@/lib/utils';
import { useState } from 'react';
import CountUp from 'react-countup';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const mockWatchlist = [
  { symbol: 'EREGL', name: 'Ereğli Demir Çelik', price: 47.85, change: 2.35, high52: 62.40, low52: 38.20, volume: '245M', hasAlert: true },
  { symbol: 'KRDMD', name: 'Kardemir', price: 12.45, change: -1.23, high52: 18.75, low52: 10.50, volume: '123M', hasAlert: false },
  { symbol: 'TUPRS', name: 'Tüpraş', price: 145.60, change: 0.87, high52: 168.90, low52: 112.30, volume: '89M', hasAlert: true },
  { symbol: 'PETKM', name: 'Petkim', price: 18.92, change: -0.45, high52: 25.60, low52: 15.80, volume: '156M', hasAlert: false },
  { symbol: 'FROTO', name: 'Ford Otosan', price: 892.50, change: 3.21, high52: 1050.00, low52: 680.00, volume: '45M', hasAlert: true },
  { symbol: 'TOASO', name: 'Tofaş Oto', price: 234.75, change: 1.85, high52: 280.00, low52: 185.50, volume: '67M', hasAlert: false },
];

export default function WatchlistPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWatchlist = mockWatchlist.filter(
    stock => stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
             stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const gainers = mockWatchlist.filter(s => s.change > 0).length;
  const losers = mockWatchlist.filter(s => s.change < 0).length;
  const withAlerts = mockWatchlist.filter(s => s.hasAlert).length;

  return (
    <motion.div
      className="space-y-6"
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
          <p className="text-white/60">Takip ettiğin hisseleri izle</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Hisse ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full md:w-64 bg-white/5 border-white/10"
            />
          </div>
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
          <Button variant="gradient">
            <Plus className="w-4 h-4 mr-2" />
            Hisse Ekle
          </Button>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-white/60 text-xs">Takip Edilen</p>
              <p className="text-xl font-bold text-white">{mockWatchlist.length}</p>
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
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-white/60 text-xs">Aktif Alarm</p>
              <p className="text-xl font-bold text-white">{withAlerts}</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Watchlist Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWatchlist.map((stock, index) => {
            const pricePosition = ((stock.price - stock.low52) / (stock.high52 - stock.low52)) * 100;

            return (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="p-6 hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden">
                  {/* Background gradient on hover */}
                  <div className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br",
                    stock.change > 0 ? "from-success/5 to-transparent" : "from-danger/5 to-transparent"
                  )} />

                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                          stock.change > 0 ? 'bg-success/20' : 'bg-danger/20'
                        )}>
                          {stock.change > 0 ? (
                            <TrendingUp className="w-6 h-6 text-success" />
                          ) : (
                            <TrendingDown className="w-6 h-6 text-danger" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{stock.symbol}</p>
                          <p className="text-xs text-white/40">{stock.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="text-yellow-500 hover:text-yellow-400 w-8 h-8">
                          <Star className="w-4 h-4 fill-current" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "w-8 h-8",
                            stock.hasAlert ? "text-primary hover:text-primary/80" : "text-white/40 hover:text-white"
                          )}
                        >
                          <Bell className={cn("w-4 h-4", stock.hasAlert && "fill-current")} />
                        </Button>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-white">
                          <CountUp
                            end={stock.price}
                            prefix="₺"
                            decimals={2}
                            decimal=","
                            separator="."
                            duration={0.5}
                          />
                        </span>
                        <Badge variant={stock.change > 0 ? 'success' : 'danger'}>
                          <span className="flex items-center gap-1">
                            {stock.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {formatPercent(Math.abs(stock.change))}
                          </span>
                        </Badge>
                      </div>
                    </div>

                    {/* 52 Week Range */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">52H Min</span>
                        <span className="text-white/40">52H Max</span>
                      </div>
                      <div className="relative">
                        <Progress value={pricePosition} variant="gradient" size="sm" />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-primary shadow-lg"
                          style={{ left: `calc(${pricePosition}% - 6px)` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">{formatCurrency(stock.low52)}</span>
                        <span className="text-white/60">{formatCurrency(stock.high52)}</span>
                      </div>
                    </div>

                    {/* Volume */}
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-white/40 text-xs">Hacim</span>
                      <span className="text-white/60 text-sm font-medium">{stock.volume}</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* List View */
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
                      <th className="pb-4 font-medium text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredWatchlist.map((stock, index) => {
                      const pricePosition = ((stock.price - stock.low52) / (stock.high52 - stock.low52)) * 100;

                      return (
                        <motion.tr
                          key={stock.symbol}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-white/5 transition-colors group"
                        >
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                stock.change > 0 ? 'bg-success/20' : 'bg-danger/20'
                              )}>
                                {stock.change > 0 ? (
                                  <TrendingUp className="w-5 h-5 text-success" />
                                ) : (
                                  <TrendingDown className="w-5 h-5 text-danger" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-white">{stock.symbol}</p>
                                <p className="text-xs text-white/40">{stock.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="text-white font-medium">{formatCurrency(stock.price)}</span>
                          </td>
                          <td className="py-4">
                            <Badge variant={stock.change > 0 ? 'success' : 'danger'}>
                              {stock.change > 0 ? '+' : ''}{formatPercent(stock.change)}
                            </Badge>
                          </td>
                          <td className="py-4 hidden md:table-cell">
                            <div className="w-32">
                              <Progress value={pricePosition} variant="gradient" size="sm" />
                              <div className="flex justify-between text-xs text-white/40 mt-1">
                                <span>{formatCurrency(stock.low52)}</span>
                                <span>{formatCurrency(stock.high52)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-white/60 hidden md:table-cell">{stock.volume}</td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="text-yellow-500 w-8 h-8">
                                <Star className="w-4 h-4 fill-current" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn("w-8 h-8", stock.hasAlert ? "text-primary" : "text-white/40")}
                              >
                                <Bell className={cn("w-4 h-4", stock.hasAlert && "fill-current")} />
                              </Button>
                            </div>
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
      )}

      {/* Empty State */}
      {filteredWatchlist.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
            <Search className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Sonuç bulunamadı</h3>
          <p className="text-white/60 text-center max-w-sm">
            "{searchQuery}" için eşleşen hisse bulunamadı
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

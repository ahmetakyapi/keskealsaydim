import { motion } from 'framer-motion';
import { Plus, Star, Bell, TrendingUp, TrendingDown, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercent, getChangeColor } from '@/lib/utils';

const mockWatchlist = [
  { symbol: 'EREGL', name: 'Ereğli Demir Çelik', price: 47.85, change: 2.35, high52: 62.40, low52: 38.20 },
  { symbol: 'KRDMD', name: 'Kardemir', price: 12.45, change: -1.23, high52: 18.75, low52: 10.50 },
  { symbol: 'TUPRS', name: 'Tüpraş', price: 145.60, change: 0.87, high52: 168.90, low52: 112.30 },
  { symbol: 'PETKM', name: 'Petkim', price: 18.92, change: -0.45, high52: 25.60, low52: 15.80 },
  { symbol: 'FROTO', name: 'Ford Otosan', price: 892.50, change: 3.21, high52: 1050.00, low52: 680.00 },
];

export default function WatchlistPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Favorilerim</h1>
          <p className="text-white/60">Takip ettiğin hisseleri izle</p>
        </div>
        <Button variant="gradient">
          <Plus className="w-4 h-4 mr-2" />
          Hisse Ekle
        </Button>
      </div>

      {/* Watchlist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockWatchlist.map((stock, index) => (
          <motion.div
            key={stock.symbol}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:border-white/20 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      stock.change > 0 ? 'bg-success/20' : 'bg-danger/20'
                    }`}>
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
                    <Button variant="ghost" size="icon" className="text-yellow-500 hover:text-yellow-400">
                      <Star className="w-4 h-4 fill-current" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white/40 hover:text-white">
                      <Bell className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold text-white">{formatCurrency(stock.price)}</span>
                    <span className={`text-sm font-semibold ${getChangeColor(stock.change)}`}>
                      {formatPercent(stock.change)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40">52H Min/Max</span>
                    <span className="text-white/60">
                      {formatCurrency(stock.low52)} - {formatCurrency(stock.high52)}
                    </span>
                  </div>

                  {/* Price range visualization */}
                  <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="absolute h-full bg-gradient-to-r from-danger via-yellow-500 to-success"
                      style={{
                        left: `${((stock.price - stock.low52) / (stock.high52 - stock.low52)) * 100}%`,
                        width: '4px',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

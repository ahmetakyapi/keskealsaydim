import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { formatCurrency, formatPercent, getChangeColor } from '@/lib/utils';

const marketIndices = [
  { name: 'BIST 100', value: 9876.54, change: 1.23 },
  { name: 'BIST 30', value: 10234.87, change: 0.98 },
  { name: 'USD/TRY', value: 32.45, change: -0.15, prefix: '' },
  { name: 'EUR/TRY', value: 35.12, change: 0.22, prefix: '' },
  { name: 'Altın', value: 2450.75, change: 0.87, prefix: '$' },
  { name: 'Petrol', value: 78.45, change: -1.24, prefix: '$' },
];

const topGainers = [
  { symbol: 'ASELS', name: 'Aselsan', price: 67.25, change: 8.5 },
  { symbol: 'THYAO', name: 'THY', price: 312.75, change: 5.2 },
  { symbol: 'FROTO', name: 'Ford Otosan', price: 892.50, change: 4.8 },
];

const topLosers = [
  { symbol: 'SISE', name: 'Şişe Cam', price: 29.85, change: -4.2 },
  { symbol: 'PETKM', name: 'Petkim', price: 18.92, change: -3.1 },
  { symbol: 'HALKB', name: 'Halkbank', price: 12.45, change: -2.8 },
];

export default function MarketPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Piyasa</h1>
        <p className="text-white/60">Piyasa genel görünümü ve önemli göstergeler</p>
      </div>

      {/* Market Indices */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {marketIndices.map((index, i) => (
          <motion.div
            key={index.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard className="p-4">
              <p className="text-white/60 text-xs mb-1">{index.name}</p>
              <p className="text-lg font-bold text-white">
                {index.prefix || ''}{index.value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-sm ${getChangeColor(index.change)}`}>
                {formatPercent(index.change)}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Gainers & Losers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <CardTitle>En Çok Yükselenler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topGainers.map((stock, i) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg bg-success/5 hover:bg-success/10 transition-colors"
              >
                <div>
                  <p className="font-medium text-white">{stock.symbol}</p>
                  <p className="text-xs text-white/40">{stock.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">{formatCurrency(stock.price)}</p>
                  <p className="text-success text-sm font-semibold">{formatPercent(stock.change)}</p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-danger" />
            </div>
            <CardTitle>En Çok Düşenler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topLosers.map((stock, i) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg bg-danger/5 hover:bg-danger/10 transition-colors"
              >
                <div>
                  <p className="font-medium text-white">{stock.symbol}</p>
                  <p className="text-xs text-white/40">{stock.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">{formatCurrency(stock.price)}</p>
                  <p className="text-danger text-sm font-semibold">{formatPercent(stock.change)}</p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Market Breadth (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-primary" />
            Piyasa Genişliği
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-success">Yükselen: 245</span>
                <span className="text-danger">Düşen: 180</span>
              </div>
              <div className="h-4 bg-white/10 rounded-full overflow-hidden flex">
                <div className="bg-success h-full" style={{ width: '58%' }} />
                <div className="bg-danger h-full" style={{ width: '42%' }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

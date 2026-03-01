import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatPercent, getChangeColor } from '@/lib/utils';
import CountUp from 'react-countup';
import { Link } from 'react-router-dom';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  // Mock data - in real app this would come from API
  const portfolioData = {
    totalValue: 156750.45,
    totalCost: 125000,
    totalProfit: 31750.45,
    totalProfitPercent: 25.4,
    dailyChange: 2345.67,
    dailyChangePercent: 1.52,
  };

  const marketData = {
    bist100: { value: 9876.54, change: 1.23 },
    usdtry: { value: 32.45, change: -0.15 },
    gold: { value: 2450.75, change: 0.87 },
  };

  const recentActivity = [
    { symbol: 'THYAO', action: 'buy', amount: 5000, date: '2024-01-15' },
    { symbol: 'GARAN', action: 'sell', amount: 3200, date: '2024-01-14' },
    { symbol: 'ASELS', action: 'buy', amount: 7500, date: '2024-01-12' },
  ];

  const topPerformers = [
    { symbol: 'ASELS', name: 'Aselsan', change: 12.5 },
    { symbol: 'THYAO', name: 'THY', change: 8.3 },
    { symbol: 'SISE', name: 'Şişe Cam', change: -4.2 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div {...fadeInUp}>
        <h1 className="text-2xl font-bold text-white mb-1">
          Merhaba, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-white/60">İşte portföyünün güncel durumu</p>
      </motion.div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div {...fadeInUp} transition={{ delay: 0.1 }}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <span className={`text-sm font-medium ${getChangeColor(portfolioData.dailyChangePercent)}`}>
                {formatPercent(portfolioData.dailyChangePercent)}
              </span>
            </div>
            <p className="text-white/60 text-sm mb-1">Toplam Değer</p>
            <p className="text-2xl font-bold text-white">
              <CountUp
                end={portfolioData.totalValue}
                prefix="₺"
                separator="."
                decimals={2}
                decimal=","
                duration={1}
              />
            </p>
          </GlassCard>
        </motion.div>

        <motion.div {...fadeInUp} transition={{ delay: 0.15 }}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
            </div>
            <p className="text-white/60 text-sm mb-1">Toplam Kar</p>
            <p className="text-2xl font-bold text-success">
              +<CountUp
                end={portfolioData.totalProfit}
                prefix="₺"
                separator="."
                decimals={2}
                decimal=","
                duration={1}
              />
            </p>
            <p className="text-success/60 text-sm mt-1">
              {formatPercent(portfolioData.totalProfitPercent)}
            </p>
          </GlassCard>
        </motion.div>

        <motion.div {...fadeInUp} transition={{ delay: 0.2 }}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-secondary" />
              </div>
            </div>
            <p className="text-white/60 text-sm mb-1">Günlük Değişim</p>
            <p className={`text-2xl font-bold ${getChangeColor(portfolioData.dailyChange)}`}>
              {portfolioData.dailyChange > 0 ? '+' : ''}
              <CountUp
                end={portfolioData.dailyChange}
                prefix="₺"
                separator="."
                decimals={2}
                decimal=","
                duration={1}
              />
            </p>
          </GlassCard>
        </motion.div>

        <motion.div {...fadeInUp} transition={{ delay: 0.25 }}>
          <GlassCard className="p-6 bg-gradient-to-br from-primary/20 to-secondary/20">
            <div className="mb-4">
              <p className="text-white/80 text-sm">Hızlı İşlem</p>
            </div>
            <Link to="/compare">
              <Button variant="gradient" className="w-full" size="sm">
                Keşke Alsaydım?
              </Button>
            </Link>
          </GlassCard>
        </motion.div>
      </div>

      {/* Market Overview & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Summary */}
        <motion.div {...fadeInUp} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Piyasa Özeti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-white/60">BIST 100</span>
                <div className="text-right">
                  <p className="font-medium text-white">{formatCurrency(marketData.bist100.value, 'TRY').replace('₺', '')}</p>
                  <p className={`text-sm ${getChangeColor(marketData.bist100.change)}`}>
                    {formatPercent(marketData.bist100.change)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-white/60">USD/TRY</span>
                <div className="text-right">
                  <p className="font-medium text-white">{marketData.usdtry.value.toFixed(2)}</p>
                  <p className={`text-sm ${getChangeColor(marketData.usdtry.change)}`}>
                    {formatPercent(marketData.usdtry.change)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-white/60">Altın (USD)</span>
                <div className="text-right">
                  <p className="font-medium text-white">${marketData.gold.value.toFixed(2)}</p>
                  <p className={`text-sm ${getChangeColor(marketData.gold.change)}`}>
                    {formatPercent(marketData.gold.change)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Performers */}
        <motion.div {...fadeInUp} transition={{ delay: 0.35 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">En İyi Performans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topPerformers.map((stock, index) => (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      stock.change > 0 ? 'bg-success/20' : 'bg-danger/20'
                    }`}>
                      {stock.change > 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-success" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-danger" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{stock.symbol}</p>
                      <p className="text-xs text-white/40">{stock.name}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${getChangeColor(stock.change)}`}>
                    {formatPercent(stock.change)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div {...fadeInUp} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Son İşlemler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      activity.action === 'buy' ? 'bg-success/20' : 'bg-danger/20'
                    }`}>
                      {activity.action === 'buy' ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-danger" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{activity.symbol}</p>
                      <p className="text-xs text-white/40">
                        {activity.action === 'buy' ? 'Alım' : 'Satım'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">{formatCurrency(activity.amount)}</p>
                    <p className="text-xs text-white/40">{activity.date}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

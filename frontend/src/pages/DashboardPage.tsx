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
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatPercent, getChangeColor } from '@/lib/utils';
import CountUp from 'react-countup';
import { Link } from 'react-router-dom';

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

export default function DashboardPage() {
  const { user } = useAuthStore();

  // Mock data
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
    { symbol: 'THYAO', action: 'buy', amount: 5000, date: '2 saat önce', icon: TrendingUp },
    { symbol: 'GARAN', action: 'sell', amount: 3200, date: '1 gün önce', icon: TrendingDown },
    { symbol: 'ASELS', action: 'buy', amount: 7500, date: '3 gün önce', icon: TrendingUp },
  ];

  const topPerformers = [
    { symbol: 'ASELS', name: 'Aselsan', change: 12.5, value: 45250 },
    { symbol: 'THYAO', name: 'THY', change: 8.3, value: 62375 },
    { symbol: 'SISE', name: 'Şişe Cam', change: -4.2, value: 28125 },
  ];

  const portfolioAllocation = [
    { symbol: 'THYAO', percent: 40, color: 'bg-primary' },
    { symbol: 'GARAN', percent: 25, color: 'bg-secondary' },
    { symbol: 'ASELS', percent: 20, color: 'bg-success' },
    { symbol: 'Diğer', percent: 15, color: 'bg-white/20' },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Welcome Header */}
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            {getGreeting()}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-white/60">İşte portföyünün güncel durumu</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-white/40 text-sm">
          <Clock className="w-4 h-4" />
          <span>Son güncelleme: Şimdi</span>
        </div>
      </motion.div>

      {/* Portfolio Summary Cards */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Value Card */}
        <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <Badge variant={portfolioData.dailyChangePercent > 0 ? 'success' : 'danger'}>
                {formatPercent(portfolioData.dailyChangePercent)}
              </Badge>
            </div>
            <p className="text-white/60 text-sm mb-1">Toplam Değer</p>
            <p className="text-2xl md:text-3xl font-bold text-white">
              ₺<CountUp
                end={portfolioData.totalValue}
                separator="."
                decimals={2}
                decimal=","
                duration={1}
              />
            </p>
          </div>
        </GlassCard>

        {/* Total Profit Card */}
        <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
            <p className="text-white/60 text-sm mb-1">Toplam Kar</p>
            <p className="text-2xl md:text-3xl font-bold text-success">
              +₺<CountUp
                end={portfolioData.totalProfit}
                separator="."
                decimals={2}
                decimal=","
                duration={1}
              />
            </p>
            <p className="text-success/60 text-sm mt-1">
              {formatPercent(portfolioData.totalProfitPercent)} getiri
            </p>
          </div>
        </GlassCard>

        {/* Daily Change Card */}
        <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <p className="text-white/60 text-sm mb-1">Günlük Değişim</p>
            <p className={`text-2xl md:text-3xl font-bold ${getChangeColor(portfolioData.dailyChange)}`}>
              {portfolioData.dailyChange > 0 ? '+' : ''}₺
              <CountUp
                end={portfolioData.dailyChange}
                separator="."
                decimals={2}
                decimal=","
                duration={1}
              />
            </p>
          </div>
        </GlassCard>

        {/* Quick Action Card */}
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
        {/* Left Column - Market & Performance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Market Summary */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Piyasa Özeti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(marketData).map(([key, data], index) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <p className="text-white/60 text-sm mb-1">
                        {key === 'bist100' ? 'BIST 100' : key === 'usdtry' ? 'USD/TRY' : 'Altın'}
                      </p>
                      <p className="font-bold text-white text-lg">
                        {key === 'gold' ? '$' : ''}{data.value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                      <div className={`flex items-center gap-1 text-sm ${getChangeColor(data.change)}`}>
                        {data.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {formatPercent(data.change)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Performers */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  En İyi Performans
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topPerformers.map((stock, index) => (
                  <motion.div
                    key={stock.symbol}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        stock.change > 0 ? 'bg-success/20' : 'bg-danger/20'
                      }`}>
                        {stock.change > 0 ? (
                          <ArrowUpRight className="w-5 h-5 text-success" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-danger" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{stock.symbol}</p>
                        <p className="text-xs text-white/40">{stock.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">{formatCurrency(stock.value)}</p>
                      <p className={`text-sm font-semibold ${getChangeColor(stock.change)}`}>
                        {stock.change > 0 ? '+' : ''}{formatPercent(stock.change)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column - Activity & Allocation */}
        <div className="space-y-6">
          {/* Portfolio Allocation */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  Portföy Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {portfolioAllocation.map((item, index) => (
                  <motion.div
                    key={item.symbol}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: '100%' }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white">{item.symbol}</span>
                      <span className="text-white/60">{item.percent}%</span>
                    </div>
                    <Progress value={item.percent} variant="gradient" size="sm" />
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-secondary" />
                  Son İşlemler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        activity.action === 'buy' ? 'bg-success/20' : 'bg-danger/20'
                      }`}>
                        <activity.icon className={`w-4 h-4 ${
                          activity.action === 'buy' ? 'text-success' : 'text-danger'
                        }`} />
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
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

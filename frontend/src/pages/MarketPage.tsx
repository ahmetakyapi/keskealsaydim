import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Globe,
  DollarSign,
  Coins,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercent, getChangeColor, cn } from '@/lib/utils';
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

const marketIndices = [
  { name: 'BIST 100', value: 9876.54, change: 1.23, icon: BarChart3, color: 'primary' },
  { name: 'BIST 30', value: 10234.87, change: 0.98, icon: Activity, color: 'secondary' },
  { name: 'USD/TRY', value: 32.45, change: -0.15, prefix: '', icon: DollarSign, color: 'danger' },
  { name: 'EUR/TRY', value: 35.12, change: 0.22, prefix: '', icon: Globe, color: 'success' },
  { name: 'Altın', value: 2450.75, change: 0.87, prefix: '$', icon: Coins, color: 'yellow' },
  { name: 'Petrol', value: 78.45, change: -1.24, prefix: '$', icon: Droplets, color: 'orange' },
];

const topGainers = [
  { symbol: 'ASELS', name: 'Aselsan', price: 67.25, change: 8.5, volume: '125M' },
  { symbol: 'THYAO', name: 'THY', price: 312.75, change: 5.2, volume: '98M' },
  { symbol: 'FROTO', name: 'Ford Otosan', price: 892.50, change: 4.8, volume: '45M' },
  { symbol: 'TOASO', name: 'Tofaş Oto', price: 234.75, change: 3.9, volume: '67M' },
  { symbol: 'EREGL', name: 'Ereğli Demir Çelik', price: 47.85, change: 2.35, volume: '245M' },
];

const topLosers = [
  { symbol: 'SISE', name: 'Şişe Cam', price: 29.85, change: -4.2, volume: '89M' },
  { symbol: 'PETKM', name: 'Petkim', price: 18.92, change: -3.1, volume: '156M' },
  { symbol: 'HALKB', name: 'Halkbank', price: 12.45, change: -2.8, volume: '234M' },
  { symbol: 'VAKBN', name: 'Vakıfbank', price: 15.67, change: -2.1, volume: '178M' },
  { symbol: 'ISCTR', name: 'İş Bankası', price: 8.92, change: -1.5, volume: '312M' },
];

const sectorPerformance = [
  { name: 'Bankacılık', change: -1.2, weight: 32 },
  { name: 'Holding', change: 2.1, weight: 18 },
  { name: 'Sanayi', change: 0.8, weight: 15 },
  { name: 'Ulaştırma', change: 3.4, weight: 12 },
  { name: 'Telekomünikasyon', change: 1.1, weight: 8 },
];

export default function MarketPage() {
  const risingCount = 245;
  const fallingCount = 180;
  const unchangedCount = 75;
  const total = risingCount + fallingCount + unchangedCount;

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <Globe className="w-7 h-7 text-primary" />
            Piyasa
          </h1>
          <p className="text-white/60">Piyasa genel görünümü ve önemli göstergeler</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-white/40 text-sm">
            <Clock className="w-4 h-4" />
            <span>Son güncelleme: Şimdi</span>
          </div>
          <Button variant="outline" className="border-white/20 text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Yenile
          </Button>
        </div>
      </motion.div>

      {/* Market Indices */}
      <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {marketIndices.map((index, i) => {
          const Icon = index.icon;
          const colorClasses: Record<string, string> = {
            primary: 'from-primary/20 bg-primary/10',
            secondary: 'from-secondary/20 bg-secondary/10',
            success: 'from-success/20 bg-success/10',
            danger: 'from-danger/20 bg-danger/10',
            yellow: 'from-yellow-500/20 bg-yellow-500/10',
            orange: 'from-orange-500/20 bg-orange-500/10',
          };
          const iconColorClasses: Record<string, string> = {
            primary: 'text-primary',
            secondary: 'text-secondary',
            success: 'text-success',
            danger: 'text-danger',
            yellow: 'text-yellow-500',
            orange: 'text-orange-500',
          };

          return (
            <motion.div
              key={index.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard className={cn(
                "p-4 hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden group",
              )}>
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity",
                  colorClasses[index.color]?.split(' ')[0]
                )} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      colorClasses[index.color]?.split(' ')[1]
                    )}>
                      <Icon className={cn("w-4 h-4", iconColorClasses[index.color])} />
                    </div>
                    <Badge variant={index.change > 0 ? 'success' : 'danger'} size="sm">
                      {index.change > 0 ? '+' : ''}{formatPercent(index.change)}
                    </Badge>
                  </div>
                  <p className="text-white/60 text-xs mb-1">{index.name}</p>
                  <p className="text-lg font-bold text-white">
                    {index.prefix || ''}<CountUp
                      end={index.value}
                      separator="."
                      decimals={2}
                      decimal=","
                      duration={0.8}
                    />
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gainers & Losers */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Gainers */}
          <motion.div variants={fadeInUp}>
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <CardTitle>En Çok Yükselenler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topGainers.map((stock, i) => (
                  <motion.div
                    key={stock.symbol}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-success/5 hover:bg-success/10 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowUpRight className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{stock.symbol}</p>
                        <p className="text-xs text-white/40">{stock.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white text-sm">{formatCurrency(stock.price)}</p>
                      <p className="text-success text-xs font-semibold">+{formatPercent(stock.change)}</p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Losers */}
          <motion.div variants={fadeInUp}>
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-danger" />
                </div>
                <CardTitle>En Çok Düşenler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topLosers.map((stock, i) => (
                  <motion.div
                    key={stock.symbol}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-danger/5 hover:bg-danger/10 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-danger/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowDownRight className="w-4 h-4 text-danger" />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{stock.symbol}</p>
                        <p className="text-xs text-white/40">{stock.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white text-sm">{formatCurrency(stock.price)}</p>
                      <p className="text-danger text-xs font-semibold">{formatPercent(stock.change)}</p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Market Breadth */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Piyasa Genişliği
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Visual representation */}
                <div className="flex h-4 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(risingCount / total) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="bg-success"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(unchangedCount / total) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="bg-white/30"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(fallingCount / total) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="bg-danger"
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-xl bg-success/10">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <ArrowUpRight className="w-4 h-4 text-success" />
                      <span className="text-success font-bold text-lg">{risingCount}</span>
                    </div>
                    <p className="text-xs text-white/40">Yükselen</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/5">
                    <span className="text-white/60 font-bold text-lg">{unchangedCount}</span>
                    <p className="text-xs text-white/40">Değişmeyen</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-danger/10">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <ArrowDownRight className="w-4 h-4 text-danger" />
                      <span className="text-danger font-bold text-lg">{fallingCount}</span>
                    </div>
                    <p className="text-xs text-white/40">Düşen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sector Performance */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-secondary" />
                  Sektör Performansı
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sectorPerformance.map((sector, i) => (
                  <motion.div
                    key={sector.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white">{sector.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40 text-xs">{sector.weight}%</span>
                        <Badge variant={sector.change > 0 ? 'success' : 'danger'} size="sm">
                          {sector.change > 0 ? '+' : ''}{formatPercent(sector.change)}
                        </Badge>
                      </div>
                    </div>
                    <Progress
                      value={sector.weight}
                      variant={sector.change > 0 ? 'success' : 'danger'}
                      size="sm"
                    />
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

import { motion } from 'framer-motion';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Wallet,
  PiggyBank,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Filter,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

const mockPortfolio = [
  { symbol: 'THYAO', name: 'Türk Hava Yolları', quantity: 500, buyPrice: 280.50, currentPrice: 312.75, change: 11.5, sector: 'Ulaşım' },
  { symbol: 'GARAN', name: 'Garanti BBVA', quantity: 1000, buyPrice: 45.20, currentPrice: 48.90, change: 8.2, sector: 'Bankacılık' },
  { symbol: 'ASELS', name: 'Aselsan', quantity: 200, buyPrice: 58.00, currentPrice: 67.25, change: 16.0, sector: 'Savunma' },
  { symbol: 'SISE', name: 'Şişe Cam', quantity: 1500, buyPrice: 32.10, currentPrice: 29.85, change: -7.0, sector: 'Sanayi' },
  { symbol: 'TCELL', name: 'Turkcell', quantity: 800, buyPrice: 72.50, currentPrice: 78.40, change: 8.1, sector: 'Teknoloji' },
];

export default function PortfolioPage() {
  const totalValue = mockPortfolio.reduce((acc, p) => acc + (p.currentPrice * p.quantity), 0);
  const totalCost = mockPortfolio.reduce((acc, p) => acc + (p.buyPrice * p.quantity), 0);
  const totalProfit = totalValue - totalCost;
  const totalProfitPercent = (totalProfit / totalCost) * 100;

  const gainers = mockPortfolio.filter(p => p.change > 0).length;
  const losers = mockPortfolio.filter(p => p.change < 0).length;

  // Calculate allocation percentages
  const allocations = mockPortfolio.map(p => ({
    symbol: p.symbol,
    value: p.currentPrice * p.quantity,
    percent: ((p.currentPrice * p.quantity) / totalValue) * 100
  })).sort((a, b) => b.percent - a.percent);

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
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Portföyüm</h1>
          <p className="text-white/60">Yatırımlarını takip et ve yönet</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-white/20 text-white hidden md:flex">
            <Download className="w-4 h-4 mr-2" />
            Dışa Aktar
          </Button>
          <Button variant="gradient">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Yatırım
          </Button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Value */}
        <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <Badge variant={totalProfitPercent > 0 ? 'success' : 'danger'}>
                {formatPercent(totalProfitPercent)}
              </Badge>
            </div>
            <p className="text-white/60 text-sm mb-1">Toplam Değer</p>
            <p className="text-2xl md:text-3xl font-bold text-white">
              ₺<CountUp
                end={totalValue}
                separator="."
                decimals={2}
                decimal=","
                duration={1}
              />
            </p>
          </div>
        </GlassCard>

        {/* Total Cost */}
        <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                <PiggyBank className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <p className="text-white/60 text-sm mb-1">Toplam Maliyet</p>
            <p className="text-2xl md:text-3xl font-bold text-white">
              ₺<CountUp
                end={totalCost}
                separator="."
                decimals={2}
                decimal=","
                duration={1}
              />
            </p>
          </div>
        </GlassCard>

        {/* Total Profit */}
        <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity",
            totalProfit > 0 ? "from-success/10" : "from-danger/10"
          )} />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                totalProfit > 0 ? "bg-success/20" : "bg-danger/20"
              )}>
                {totalProfit > 0 ? (
                  <TrendingUp className="w-6 h-6 text-success" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-danger" />
                )}
              </div>
            </div>
            <p className="text-white/60 text-sm mb-1">Toplam Kar/Zarar</p>
            <p className={cn("text-2xl md:text-3xl font-bold", getChangeColor(totalProfit))}>
              {totalProfit > 0 ? '+' : ''}₺
              <CountUp
                end={Math.abs(totalProfit)}
                separator="."
                decimals={2}
                decimal=","
                duration={1}
              />
            </p>
          </div>
        </GlassCard>

        {/* Performance Summary */}
        <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <p className="text-white/60 text-sm mb-1">Performans</p>
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
            <p className="text-white/40 text-xs mt-2">
              {mockPortfolio.length} hisse
            </p>
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
                Varlıklar
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-white/40 hover:text-white">
                <Filter className="w-4 h-4 mr-2" />
                Filtrele
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-white/40 text-sm border-b border-white/10">
                      <th className="pb-4 font-medium">Hisse</th>
                      <th className="pb-4 font-medium hidden md:table-cell">Miktar</th>
                      <th className="pb-4 font-medium hidden md:table-cell">Alış</th>
                      <th className="pb-4 font-medium">Güncel</th>
                      <th className="pb-4 font-medium text-right">Kar/Zarar</th>
                      <th className="pb-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {mockPortfolio.map((holding, index) => {
                      const value = holding.currentPrice * holding.quantity;
                      const cost = holding.buyPrice * holding.quantity;
                      const profit = value - cost;
                      const profitPercent = (profit / cost) * 100;

                      return (
                        <motion.tr
                          key={holding.symbol}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-white/5 transition-colors group"
                        >
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                                holding.change > 0 ? 'bg-success/20' : 'bg-danger/20'
                              )}>
                                {holding.change > 0 ? (
                                  <TrendingUp className="w-5 h-5 text-success" />
                                ) : (
                                  <TrendingDown className="w-5 h-5 text-danger" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-white">{holding.symbol}</p>
                                <p className="text-xs text-white/40">{holding.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-white hidden md:table-cell">
                            {holding.quantity.toLocaleString('tr-TR')}
                          </td>
                          <td className="py-4 text-white/60 hidden md:table-cell">
                            {formatCurrency(holding.buyPrice)}
                          </td>
                          <td className="py-4">
                            <div>
                              <span className="text-white font-medium">{formatCurrency(holding.currentPrice)}</span>
                              <div className={cn("text-xs flex items-center gap-1", getChangeColor(holding.change))}>
                                {holding.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {formatPercent(Math.abs(holding.change))}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-right">
                            <p className={cn("font-semibold", getChangeColor(profit))}>
                              {profit > 0 ? '+' : ''}{formatCurrency(profit)}
                            </p>
                            <Badge
                              variant={profit > 0 ? 'success' : 'danger'}
                              size="sm"
                              className="mt-1"
                            >
                              {formatPercent(profitPercent)}
                            </Badge>
                          </td>
                          <td className="py-4">
                            <Button variant="ghost" size="icon" className="text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
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

        {/* Portfolio Allocation */}
        <motion.div variants={fadeInUp}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Portföy Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {allocations.map((item, index) => {
                const colors = [
                  'from-primary to-primary',
                  'from-secondary to-secondary',
                  'from-success to-success',
                  'from-purple-500 to-purple-500',
                  'from-orange-500 to-orange-500'
                ];

                return (
                  <motion.div
                    key={item.symbol}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full bg-gradient-to-r", colors[index % colors.length])} />
                        <span className="text-white font-medium">{item.symbol}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white/60">{item.percent.toFixed(1)}%</span>
                        <span className="text-white/40 text-xs ml-2">
                          ({formatCurrency(item.value)})
                        </span>
                      </div>
                    </div>
                    <Progress value={item.percent} variant="gradient" size="sm" />
                  </motion.div>
                );
              })}

              <div className="pt-4 mt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Toplam</span>
                  <span className="text-white font-bold">{formatCurrency(totalValue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

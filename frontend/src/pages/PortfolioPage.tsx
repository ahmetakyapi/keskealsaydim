import { motion } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercent, getChangeColor } from '@/lib/utils';

const mockPortfolio = [
  { symbol: 'THYAO', name: 'Türk Hava Yolları', quantity: 500, buyPrice: 280.50, currentPrice: 312.75, change: 11.5 },
  { symbol: 'GARAN', name: 'Garanti BBVA', quantity: 1000, buyPrice: 45.20, currentPrice: 48.90, change: 8.2 },
  { symbol: 'ASELS', name: 'Aselsan', quantity: 200, buyPrice: 58.00, currentPrice: 67.25, change: 16.0 },
  { symbol: 'SISE', name: 'Şişe Cam', quantity: 1500, buyPrice: 32.10, currentPrice: 29.85, change: -7.0 },
  { symbol: 'TCELL', name: 'Turkcell', quantity: 800, buyPrice: 72.50, currentPrice: 78.40, change: 8.1 },
];

export default function PortfolioPage() {
  const totalValue = mockPortfolio.reduce((acc, p) => acc + (p.currentPrice * p.quantity), 0);
  const totalCost = mockPortfolio.reduce((acc, p) => acc + (p.buyPrice * p.quantity), 0);
  const totalProfit = totalValue - totalCost;
  const totalProfitPercent = (totalProfit / totalCost) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Portföyüm</h1>
          <p className="text-white/60">Yatırımlarını takip et ve yönet</p>
        </div>
        <Button variant="gradient">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Yatırım Ekle
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-6">
          <p className="text-white/60 text-sm mb-2">Toplam Değer</p>
          <p className="text-3xl font-bold text-white">{formatCurrency(totalValue)}</p>
        </GlassCard>
        <GlassCard className="p-6">
          <p className="text-white/60 text-sm mb-2">Toplam Maliyet</p>
          <p className="text-3xl font-bold text-white">{formatCurrency(totalCost)}</p>
        </GlassCard>
        <GlassCard className="p-6">
          <p className="text-white/60 text-sm mb-2">Toplam Kar/Zarar</p>
          <p className={`text-3xl font-bold ${getChangeColor(totalProfit)}`}>
            {totalProfit > 0 ? '+' : ''}{formatCurrency(totalProfit)}
          </p>
          <p className={`text-sm ${getChangeColor(totalProfitPercent)}`}>
            {formatPercent(totalProfitPercent)}
          </p>
        </GlassCard>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Varlıklar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-white/40 text-sm border-b border-white/10">
                  <th className="pb-4 font-medium">Hisse</th>
                  <th className="pb-4 font-medium">Miktar</th>
                  <th className="pb-4 font-medium">Alış Fiyatı</th>
                  <th className="pb-4 font-medium">Güncel Fiyat</th>
                  <th className="pb-4 font-medium">Değer</th>
                  <th className="pb-4 font-medium">Kar/Zarar</th>
                  <th className="pb-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mockPortfolio.map((holding) => {
                  const value = holding.currentPrice * holding.quantity;
                  const cost = holding.buyPrice * holding.quantity;
                  const profit = value - cost;
                  const profitPercent = (profit / cost) * 100;

                  return (
                    <motion.tr
                      key={holding.symbol}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            holding.change > 0 ? 'bg-success/20' : 'bg-danger/20'
                          }`}>
                            {holding.change > 0 ? (
                              <TrendingUp className="w-5 h-5 text-success" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-danger" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{holding.symbol}</p>
                            <p className="text-xs text-white/40">{holding.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-white">{holding.quantity}</td>
                      <td className="py-4 text-white">{formatCurrency(holding.buyPrice)}</td>
                      <td className="py-4">
                        <span className="text-white">{formatCurrency(holding.currentPrice)}</span>
                        <span className={`text-xs ml-2 ${getChangeColor(holding.change)}`}>
                          {formatPercent(holding.change)}
                        </span>
                      </td>
                      <td className="py-4 text-white font-medium">{formatCurrency(value)}</td>
                      <td className="py-4">
                        <span className={`font-semibold ${getChangeColor(profit)}`}>
                          {profit > 0 ? '+' : ''}{formatCurrency(profit)}
                        </span>
                        <span className={`text-xs ml-2 ${getChangeColor(profitPercent)}`}>
                          ({formatPercent(profitPercent)})
                        </span>
                      </td>
                      <td className="py-4">
                        <Button variant="ghost" size="icon" className="text-white/40 hover:text-white">
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
    </div>
  );
}

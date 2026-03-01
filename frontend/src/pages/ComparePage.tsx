import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitCompare,
  Calendar,
  DollarSign,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Share2,
  Bookmark,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatPercent, getChangeColor, cn } from '@/lib/utils';
import CountUp from 'react-countup';
import Confetti from 'react-confetti';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ComparisonResult {
  symbolA: { symbol: string; name: string; startPrice: number; endPrice: number; profit: number; profitPercent: number };
  symbolB: { symbol: string; name: string; startPrice: number; endPrice: number; profit: number; profitPercent: number };
  difference: number;
  differencePercent: number;
  winner: 'A' | 'B';
  missedOpportunity: boolean;
  chartData: { date: string; priceA: number; priceB: number }[];
}

// Mock comparison result generator
const generateMockResult = (symbolA: string, symbolB: string, amount: number): ComparisonResult => {
  const startPriceA = Math.random() * 200 + 50;
  const startPriceB = Math.random() * 200 + 50;
  const changeA = (Math.random() - 0.3) * 60;
  const changeB = (Math.random() - 0.3) * 60;
  const endPriceA = startPriceA * (1 + changeA / 100);
  const endPriceB = startPriceB * (1 + changeB / 100);

  const quantityA = amount / startPriceA;
  const quantityB = amount / startPriceB;
  const endValueA = quantityA * endPriceA;
  const endValueB = quantityB * endPriceB;
  const profitA = endValueA - amount;
  const profitB = endValueB - amount;

  const chartData = Array.from({ length: 30 }, (_, i) => ({
    date: `Gün ${i + 1}`,
    priceA: startPriceA + (endPriceA - startPriceA) * (i / 29) + (Math.random() - 0.5) * 10,
    priceB: startPriceB + (endPriceB - startPriceB) * (i / 29) + (Math.random() - 0.5) * 10,
  }));

  return {
    symbolA: {
      symbol: symbolA,
      name: symbolA === 'THYAO' ? 'Türk Hava Yolları' : symbolA,
      startPrice: startPriceA,
      endPrice: endPriceA,
      profit: profitA,
      profitPercent: (profitA / amount) * 100,
    },
    symbolB: {
      symbol: symbolB,
      name: symbolB === 'GARAN' ? 'Garanti BBVA' : symbolB,
      startPrice: startPriceB,
      endPrice: endPriceB,
      profit: profitB,
      profitPercent: (profitB / amount) * 100,
    },
    difference: Math.abs(profitB - profitA),
    differencePercent: Math.abs((profitB / amount) * 100 - (profitA / amount) * 100),
    winner: profitB > profitA ? 'B' : 'A',
    missedOpportunity: profitB > profitA,
    chartData,
  };
};

export default function ComparePage() {
  const [symbolA, setSymbolA] = useState('THYAO');
  const [symbolB, setSymbolB] = useState('GARAN');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [amount, setAmount] = useState('10000');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleCompare = async () => {
    setIsLoading(true);
    setResult(null);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockResult = generateMockResult(symbolA, symbolB, parseFloat(amount));
    setResult(mockResult);

    if (!mockResult.missedOpportunity && mockResult.symbolA.profit > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }

    setIsLoading(false);
  };

  const handleReset = () => {
    setResult(null);
    setSymbolA('THYAO');
    setSymbolB('GARAN');
    setStartDate('2024-01-01');
    setAmount('10000');
  };

  return (
    <div className="space-y-6">
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
            <GitCompare className="w-7 h-7 text-primary" />
            Keşke Alsaydım?
          </h1>
          <p className="text-white/60">İki yatırımı karşılaştır ve kaçırdığın fırsatları keşfet</p>
        </div>
        {result && (
          <Button variant="outline" onClick={handleReset} className="border-white/20 text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Yeni Karşılaştırma
          </Button>
        )}
      </div>

      {/* Input Form */}
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GlassCard className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                <div className="space-y-2">
                  <Label className="text-white/80">Aldığım Hisse</Label>
                  <Input
                    placeholder="örn: THYAO"
                    value={symbolA}
                    onChange={(e) => setSymbolA(e.target.value.toUpperCase())}
                    className="bg-white/5 border-white/10 text-center text-lg font-mono"
                  />
                </div>

                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Almayı Düşündüğüm</Label>
                  <Input
                    placeholder="örn: GARAN"
                    value={symbolB}
                    onChange={(e) => setSymbolB(e.target.value.toUpperCase())}
                    className="bg-white/5 border-white/10 text-center text-lg font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Tarih</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Yatırım Tutarı (₺)</Label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <Button
                  size="xl"
                  variant="gradient"
                  onClick={handleCompare}
                  loading={isLoading}
                  disabled={!symbolA || !symbolB || !amount}
                  className="min-w-[200px]"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Karşılaştır
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Result Summary Card */}
            <GlassCard
              className={cn(
                'p-8 text-center relative overflow-hidden',
                result.missedOpportunity ? 'bg-danger/10 border-danger/30' : 'bg-success/10 border-success/30'
              )}
            >
              {/* Background glow */}
              <div
                className={cn(
                  'absolute inset-0 opacity-20',
                  result.missedOpportunity
                    ? 'bg-gradient-radial from-danger/50 to-transparent'
                    : 'bg-gradient-radial from-success/50 to-transparent'
                )}
              />

              <div className="relative z-10">
                <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-white/10">
                  {result.missedOpportunity ? (
                    <TrendingDown className="w-10 h-10 text-danger" />
                  ) : (
                    <TrendingUp className="w-10 h-10 text-success" />
                  )}
                </div>

                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  {result.missedOpportunity ? (
                    <>
                      Eğer <span className="text-primary">{result.symbolB.symbol}</span> alsaydın...
                    </>
                  ) : (
                    <>
                      Doğru seçim yaptın! <span className="text-success">{result.symbolA.symbol}</span> daha iyi performans gösterdi
                    </>
                  )}
                </h2>

                <div className={cn('text-5xl md:text-6xl font-bold mb-4', result.missedOpportunity ? 'text-danger' : 'text-success')}>
                  {result.missedOpportunity ? '-' : '+'}
                  <CountUp
                    end={result.difference}
                    prefix="₺"
                    separator="."
                    decimals={2}
                    decimal=","
                    duration={1.5}
                  />
                </div>

                <p className="text-white/60 text-lg">
                  {result.missedOpportunity
                    ? `Bu kadar daha fazla kazanabilirdin (${formatPercent(result.differencePercent)})`
                    : `Bu kadar daha fazla kazandın (${formatPercent(result.differencePercent)})`}
                </p>

                <div className="flex justify-center gap-4 mt-8">
                  <Button variant="outline" className="border-white/20 text-white">
                    <Bookmark className="w-4 h-4 mr-2" />
                    Kaydet
                  </Button>
                  <Button variant="outline" className="border-white/20 text-white">
                    <Share2 className="w-4 h-4 mr-2" />
                    Paylaş
                  </Button>
                </div>
              </div>
            </GlassCard>

            {/* Side by Side Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Symbol A Card */}
              <Card className={cn(!result.missedOpportunity && 'border-success/30')}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{result.symbolA.symbol}</span>
                    {!result.missedOpportunity && (
                      <span className="text-xs bg-success/20 text-success px-2 py-1 rounded">KAZANAN</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/40 text-sm">Başlangıç Fiyatı</p>
                      <p className="text-white font-medium">{formatCurrency(result.symbolA.startPrice)}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-sm">Bitiş Fiyatı</p>
                      <p className="text-white font-medium">{formatCurrency(result.symbolA.endPrice)}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-white/40 text-sm mb-1">Kar/Zarar</p>
                    <p className={cn('text-2xl font-bold', getChangeColor(result.symbolA.profit))}>
                      {result.symbolA.profit > 0 ? '+' : ''}{formatCurrency(result.symbolA.profit)}
                    </p>
                    <p className={cn('text-sm', getChangeColor(result.symbolA.profitPercent))}>
                      {formatPercent(result.symbolA.profitPercent)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Symbol B Card */}
              <Card className={cn(result.missedOpportunity && 'border-success/30')}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{result.symbolB.symbol}</span>
                    {result.missedOpportunity && (
                      <span className="text-xs bg-success/20 text-success px-2 py-1 rounded">KAZANAN</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/40 text-sm">Başlangıç Fiyatı</p>
                      <p className="text-white font-medium">{formatCurrency(result.symbolB.startPrice)}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-sm">Bitiş Fiyatı</p>
                      <p className="text-white font-medium">{formatCurrency(result.symbolB.endPrice)}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-white/40 text-sm mb-1">Kar/Zarar</p>
                    <p className={cn('text-2xl font-bold', getChangeColor(result.symbolB.profit))}>
                      {result.symbolB.profit > 0 ? '+' : ''}{formatCurrency(result.symbolB.profit)}
                    </p>
                    <p className={cn('text-sm', getChangeColor(result.symbolB.profitPercent))}>
                      {formatPercent(result.symbolB.profitPercent)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Performans Karşılaştırması</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255,255,255,0.4)"
                        tick={{ fill: 'rgba(255,255,255,0.6)' }}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.4)"
                        tick={{ fill: 'rgba(255,255,255,0.6)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1A1A26',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="priceA"
                        name={result.symbolA.symbol}
                        stroke="#6C63FF"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="priceB"
                        name={result.symbolB.symbol}
                        stroke="#00D4AA"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Section (Placeholder) */}
      {!result && (
        <Card>
          <CardHeader>
            <CardTitle>Geçmiş Karşılaştırmalar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/40 text-center py-8">
              Henüz karşılaştırma yapmadın. İlk karşılaştırmanı yap!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

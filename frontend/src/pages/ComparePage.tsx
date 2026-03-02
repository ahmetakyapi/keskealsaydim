import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Share2,
  Bookmark,
  RefreshCw,
  Sparkles,
  Activity,
  BarChart2,
  Clock,
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
import { compareService } from '@/services/compareService';
import { stockService } from '@/services/stockService';
import { useAuthStore } from '@/stores/authStore';
import type { CompareResponse, CompareResultData, CompareMetrics, SavedScenario } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChartPoint {
  date: string;
  normalizedA: number;
  normalizedB: number;
}

type AmountType = 'MONEY' | 'QUANTITY';

type ClosePoint = { date: string; close: number };

// ── Pure module-level helpers ─────────────────────────────────────────────────

function toClosePoints(
  data: { date: string; close: number; adjustedClose: number }[]
): ClosePoint[] {
  return data.map((p) => ({ date: p.date, close: p.adjustedClose || p.close }));
}

function buildNormalizedChartData(
  historyA: ClosePoint[],
  historyB: ClosePoint[]
): ChartPoint[] {
  if (!historyA.length || !historyB.length) return [];

  const baseA = historyA[0].close;
  const baseB = historyB[0].close;
  const mapB = new Map(historyB.map((p) => [p.date, p.close]));

  const points: ChartPoint[] = [];
  for (const pointA of historyA) {
    const closeB = mapB.get(pointA.date);
    if (closeB !== undefined) {
      points.push({
        date: pointA.date,
        normalizedA: Number.parseFloat(((pointA.close / baseA) * 100).toFixed(2)),
        normalizedB: Number.parseFloat(((closeB / baseB) * 100).toFixed(2)),
      });
    }
  }
  return points;
}

function formatAmountLabel(amountType: AmountType, amount: number): string {
  return amountType === 'MONEY' ? formatCurrency(amount) : `${amount} adet`;
}

// ── Sub-components (module scope to exclude from parent's complexity score) ───

interface CompareFormProps {
  readonly symbolA: string;
  readonly symbolB: string;
  readonly startDate: string;
  readonly amount: string;
  readonly amountType: AmountType;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onSymbolAChange: (v: string) => void;
  readonly onSymbolBChange: (v: string) => void;
  readonly onStartDateChange: (v: string) => void;
  readonly onAmountChange: (v: string) => void;
  readonly onAmountTypeChange: (v: AmountType) => void;
  readonly onCompare: () => void;
}

function CompareForm({
  symbolA, symbolB, startDate, amount, amountType,
  isLoading, error,
  onSymbolAChange, onSymbolBChange, onStartDateChange,
  onAmountChange, onAmountTypeChange, onCompare,
}: CompareFormProps) {
  const amountLabel = amountType === 'MONEY' ? 'Yatırım Tutarı (₺)' : 'Adet';
  const amountPlaceholder = amountType === 'MONEY' ? '10000' : '100';

  return (
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
              onChange={(e) => onSymbolAChange(e.target.value.toUpperCase())}
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
              onChange={(e) => onSymbolBChange(e.target.value.toUpperCase())}
              className="bg-white/5 border-white/10 text-center text-lg font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">Tarih</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">{amountLabel}</Label>
            <Input
              type="number"
              placeholder={amountPlaceholder}
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {(['MONEY', 'QUANTITY'] as AmountType[]).map((type) => (
              <button
                key={type}
                onClick={() => onAmountTypeChange(type)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  amountType === type ? 'bg-primary text-white shadow' : 'text-white/60 hover:text-white'
                )}
              >
                {type === 'MONEY' ? 'Tutar (₺)' : 'Adet'}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm text-center">
            {error}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button
            size="xl"
            variant="gradient"
            onClick={onCompare}
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
  );
}

interface ResultSummaryCardProps {
  readonly result: CompareResponse;
}

function ResultSummaryCard({ result }: ResultSummaryCardProps) {
  const { difference } = result.result;
  const missed = difference.missedOpportunity;
  const themeClass = missed ? 'bg-danger/10 border-danger/30' : 'bg-success/10 border-success/30';
  const glowClass = missed
    ? 'bg-gradient-radial from-danger/50 to-transparent'
    : 'bg-gradient-radial from-success/50 to-transparent';
  const amountColorClass = missed ? 'text-danger' : 'text-success';
  const sign = missed ? '-' : '+';
  const bodyText = missed
    ? `Bu kadar daha fazla kazanabilirdin (${formatPercent(difference.percentagePoints)})`
    : `Bu kadar daha fazla kazandın (${formatPercent(difference.percentagePoints)})`;

  return (
    <GlassCard className={cn('p-8 text-center relative overflow-hidden', themeClass)}>
      <div className={cn('absolute inset-0 opacity-20', glowClass)} />
      <div className="relative z-10">
        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-white/10">
          {missed ? (
            <TrendingDown className="w-10 h-10 text-danger" />
          ) : (
            <TrendingUp className="w-10 h-10 text-success" />
          )}
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          {missed ? (
            <>Eğer <span className="text-primary">{result.symbolB}</span> alsaydın...</>
          ) : (
            <>Doğru seçim yaptın! <span className="text-success">{result.symbolA}</span> daha iyi performans gösterdi</>
          )}
        </h2>

        <div className={cn('text-5xl md:text-6xl font-bold mb-4', amountColorClass)}>
          {sign}
          <CountUp
            end={difference.absoluteTL}
            prefix="₺"
            separator="."
            decimals={2}
            decimal=","
            duration={1.5}
          />
        </div>

        <p className="text-white/60 text-lg">{bodyText}</p>

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
  );
}

interface SymbolCardProps {
  readonly symbol: string;
  readonly symbolName: string;
  readonly data: CompareResultData['symbolA'];
  readonly isWinner: boolean;
}

function SymbolCard({ symbol, symbolName, data, isWinner }: SymbolCardProps) {
  return (
    <Card className={cn(isWinner && 'border-success/30')}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            {symbol}
            {symbolName && (
              <span className="text-white/40 text-sm font-normal ml-2">{symbolName}</span>
            )}
          </span>
          {isWinner && (
            <span className="text-xs bg-success/20 text-success px-2 py-1 rounded">KAZANAN</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-white/40 text-sm">Başlangıç Fiyatı</p>
            <p className="text-white font-medium">{formatCurrency(data.startPrice)}</p>
          </div>
          <div>
            <p className="text-white/40 text-sm">Bitiş Fiyatı</p>
            <p className="text-white font-medium">{formatCurrency(data.endPrice)}</p>
          </div>
        </div>
        <div className="pt-4 border-t border-white/10">
          <p className="text-white/40 text-sm mb-1">Kar/Zarar</p>
          <p className={cn('text-2xl font-bold', getChangeColor(data.profit))}>
            {data.profit > 0 ? '+' : ''}
            {formatCurrency(data.profit)}
          </p>
          <p className={cn('text-sm', getChangeColor(data.profitPercent))}>
            {formatPercent(data.profitPercent)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricsRowProps {
  readonly metrics: CompareMetrics;
  readonly symbolA: string;
  readonly symbolB: string;
}

function MetricsRow({ metrics, symbolA, symbolB }: MetricsRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <GlassCard className="p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-primary/70" />
          <p className="text-white/50 text-sm">{symbolA} Volatilite</p>
        </div>
        <p className="text-white text-xl font-bold">{formatPercent(metrics.symbolAVolatility)}</p>
      </GlassCard>
      <GlassCard className="p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <BarChart2 className="w-4 h-4 text-secondary/70" />
          <p className="text-white/50 text-sm">Korelasyon</p>
        </div>
        <p className="text-white text-xl font-bold">{formatPercent(metrics.correlation)}</p>
      </GlassCard>
      <GlassCard className="p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-primary/70" />
          <p className="text-white/50 text-sm">{symbolB} Volatilite</p>
        </div>
        <p className="text-white text-xl font-bold">{formatPercent(metrics.symbolBVolatility)}</p>
      </GlassCard>
    </div>
  );
}

interface PerformanceChartProps {
  readonly chartData: ChartPoint[];
  readonly symbolA: string;
  readonly symbolB: string;
}

function PerformanceChart({ chartData, symbolA, symbolB }: PerformanceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performans Karşılaştırması (Normalize)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A26',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: number, name: string) => [`${value.toFixed(2)}`, name]}
                />
                <Legend />
                <Line type="monotone" dataKey="normalizedA" name={symbolA} stroke="#6C63FF" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="normalizedB" name={symbolB} stroke="#00D4AA" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-white/40">
              Grafik verisi yüklenemedi
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface HistoryRowProps {
  readonly scenario: SavedScenario;
}

function HistoryRow({ scenario }: HistoryRowProps) {
  const { difference } = scenario.result;
  const winnerSymbol =
    difference.winnerSymbol === 'A' ? scenario.symbolA : scenario.symbolB;
  const sign = difference.missedOpportunity ? '-' : '+';
  const amountText = formatAmountLabel(
    scenario.amountType as AmountType,
    scenario.amount
  );

  return (
    <motion.div
      key={scenario.id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/8 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <GitCompare className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-white font-medium">
            {scenario.symbolA} vs {scenario.symbolB}
          </p>
          <p className="text-white/40 text-sm">
            {scenario.startDate} &middot; {amountText}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={cn(
            'font-semibold',
            difference.missedOpportunity ? 'text-danger' : 'text-success'
          )}
        >
          {sign}{formatCurrency(difference.absoluteTL)}
        </p>
        <p className="text-white/40 text-xs">
          Kazanan: <span className="text-white/70">{winnerSymbol}</span>
        </p>
      </div>
    </motion.div>
  );
}

interface HistorySectionProps {
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly history: SavedScenario[];
}

function HistorySection({ isAuthenticated, isLoading, history }: HistorySectionProps) {
  const renderContent = () => {
    if (!isAuthenticated) {
      return (
        <p className="text-white/40 text-center py-8">
          Geçmiş karşılaştırmalarını görmek için giriş yap.
        </p>
      );
    }
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-6 h-6 text-primary animate-spin" />
        </div>
      );
    }
    if (history.length === 0) {
      return (
        <p className="text-white/40 text-center py-8">
          Henüz karşılaştırma yapmadın. İlk karşılaştırmanı yap!
        </p>
      );
    }
    return (
      <div className="space-y-3">
        {history.map((scenario) => (
          <HistoryRow key={scenario.id} scenario={scenario} />
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary/70" />
          Geçmiş Karşılaştırmalar
        </CardTitle>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}

interface ResultPanelProps {
  readonly result: CompareResponse;
  readonly chartData: ChartPoint[];
}

function ResultPanel({ result, chartData }: ResultPanelProps) {
  const { difference, metrics } = result.result;
  const isWinnerA = difference.winnerSymbol === 'A';

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <ResultSummaryCard result={result} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SymbolCard
          symbol={result.symbolA}
          symbolName={result.symbolAName}
          data={result.result.symbolA}
          isWinner={isWinnerA}
        />
        <SymbolCard
          symbol={result.symbolB}
          symbolName={result.symbolBName}
          data={result.result.symbolB}
          isWinner={!isWinnerA}
        />
      </div>

      <MetricsRow metrics={metrics} symbolA={result.symbolA} symbolB={result.symbolB} />

      <PerformanceChart chartData={chartData} symbolA={result.symbolA} symbolB={result.symbolB} />
    </motion.div>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

export default function ComparePage() {
  const { isAuthenticated } = useAuthStore();

  const [symbolA, setSymbolA] = useState('THYAO');
  const [symbolB, setSymbolB] = useState('GARAN');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [amount, setAmount] = useState('10000');
  const [amountType, setAmountType] = useState<AmountType>('MONEY');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [history, setHistory] = useState<SavedScenario[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
    }
  }, [isAuthenticated]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const page = await compareService.getHistory(0, 10);
      setHistory(page.content);
    } catch {
      // Non-critical; silently ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  const triggerConfettiIfWon = (compareResult: CompareResponse) => {
    const { difference } = compareResult.result;
    if (!difference.missedOpportunity && compareResult.result.symbolA.profit > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const handleCompare = async () => {
    if (!symbolA || !symbolB || !amount) return;
    setIsLoading(true);
    setResult(null);
    setChartData([]);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const [compareResult, histA, histB] = await Promise.all([
        compareService.compare({
          symbolA, symbolB, startDate,
          amount: Number.parseFloat(amount),
          amountType,
          saveScenario: isAuthenticated,
        }),
        stockService.getHistory(symbolA, startDate, today),
        stockService.getHistory(symbolB, startDate, today),
      ]);

      setResult(compareResult);
      setChartData(buildNormalizedChartData(toClosePoints(histA.data), toClosePoints(histB.data)));
      triggerConfettiIfWon(compareResult);

      if (isAuthenticated) {
        fetchHistory();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Karşılaştırma sırasında bir hata oluştu.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setChartData([]);
    setError(null);
    setSymbolA('THYAO');
    setSymbolB('GARAN');
    setStartDate('2024-01-01');
    setAmount('10000');
    setAmountType('MONEY');
  };

  return (
    <div className="space-y-6">
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

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

      <AnimatePresence mode="wait">
        {result ? (
          <ResultPanel result={result} chartData={chartData} />
        ) : (
          <CompareForm
            symbolA={symbolA}
            symbolB={symbolB}
            startDate={startDate}
            amount={amount}
            amountType={amountType}
            isLoading={isLoading}
            error={error}
            onSymbolAChange={setSymbolA}
            onSymbolBChange={setSymbolB}
            onStartDateChange={setStartDate}
            onAmountChange={setAmount}
            onAmountTypeChange={setAmountType}
            onCompare={handleCompare}
          />
        )}
      </AnimatePresence>

      {!result && (
        <HistorySection
          isAuthenticated={isAuthenticated}
          isLoading={historyLoading}
          history={history}
        />
      )}
    </div>
  );
}

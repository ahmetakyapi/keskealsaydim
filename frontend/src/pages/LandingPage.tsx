import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useScroll,
  useMotionValueEvent,
  useInView,
  AnimatePresence,
} from 'framer-motion';
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  BarChart2,
  Globe,
  Shield,
  Zap,
  ChevronDown,
  LineChart,
  Search,
  Check,
  Sparkles,
} from 'lucide-react';
import CountUp from 'react-countup';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart as ReLineChart,
  Line,
} from 'recharts';

// ─────────────────────────────────────────
// DEMO DATA – real historical approximations
// ─────────────────────────────────────────
interface DemoScenario {
  symbol: string;
  name: string;
  exchange: string;
  buyDate: string;
  tagline: string;
  investment: number;
  finalValue: number;
  returnPct: number;
  isProfit: boolean;
  accentColor: string;
  data: { t: string; v: number }[];
}

const SCENARIOS: DemoScenario[] = [
  {
    symbol: 'NVDA',
    name: 'NVIDIA',
    exchange: 'NASDAQ',
    buyDate: 'Ocak 2023',
    tagline: 'Yapay Zeka Rallisi',
    investment: 10000,
    finalValue: 53200,
    returnPct: 432,
    isProfit: true,
    accentColor: '#00C896',
    data: [
      { t: 'Oca 23', v: 10000 },
      { t: 'Şub 23', v: 10500 },
      { t: 'Mar 23', v: 13000 },
      { t: 'Nis 23', v: 15500 },
      { t: 'May 23', v: 22500 },
      { t: 'Haz 23', v: 28000 },
      { t: 'Tem 23', v: 26000 },
      { t: 'Ağu 23', v: 29500 },
      { t: 'Eyl 23', v: 25500 },
      { t: 'Eki 23', v: 23000 },
      { t: 'Kas 23', v: 27500 },
      { t: 'Ara 23', v: 29500 },
      { t: 'Oca 24', v: 32000 },
      { t: 'Şub 24', v: 50000 },
      { t: 'Mar 24', v: 48000 },
      { t: 'Nis 24', v: 42000 },
      { t: 'May 24', v: 55000 },
      { t: 'Haz 24', v: 48000 },
      { t: 'Tem 24', v: 42000 },
      { t: 'Ağu 24', v: 48000 },
      { t: 'Eyl 24', v: 49000 },
      { t: 'Eki 24', v: 53000 },
      { t: 'Kas 24', v: 58000 },
      { t: 'Ara 24', v: 52000 },
      { t: 'Oca 25', v: 55000 },
      { t: 'Şub 25', v: 49000 },
      { t: 'Mar 25', v: 53200 },
    ],
  },
  {
    symbol: 'AAPL',
    name: 'Apple',
    exchange: 'NASDAQ',
    buyDate: 'Ocak 2019',
    tagline: 'İstikrarlı Büyüme',
    investment: 10000,
    finalValue: 35500,
    returnPct: 255,
    isProfit: true,
    accentColor: '#60A5FA',
    data: [
      { t: 'Oca 19', v: 10000 },
      { t: 'Nis 19', v: 11200 },
      { t: 'Tem 19', v: 12500 },
      { t: 'Eki 19', v: 13200 },
      { t: 'Oca 20', v: 17500 },
      { t: 'Nis 20', v: 13500 },
      { t: 'Tem 20', v: 20000 },
      { t: 'Eki 20', v: 19500 },
      { t: 'Oca 21', v: 21000 },
      { t: 'Nis 21', v: 22500 },
      { t: 'Tem 21', v: 24500 },
      { t: 'Eki 21', v: 26000 },
      { t: 'Oca 22', v: 28000 },
      { t: 'Nis 22', v: 25000 },
      { t: 'Tem 22', v: 23500 },
      { t: 'Eki 22', v: 22000 },
      { t: 'Oca 23', v: 24000 },
      { t: 'Nis 23', v: 26500 },
      { t: 'Tem 23', v: 29500 },
      { t: 'Eki 23', v: 27500 },
      { t: 'Oca 24', v: 28500 },
      { t: 'Nis 24', v: 29000 },
      { t: 'Tem 24', v: 31000 },
      { t: 'Eki 24', v: 33000 },
      { t: 'Oca 25', v: 34000 },
      { t: 'Mar 25', v: 35500 },
    ],
  },
  {
    symbol: 'THYAO',
    name: 'Türk Hava Yolları',
    exchange: 'BIST',
    buyDate: 'Ocak 2022',
    tagline: 'BIST Şampiyonu',
    investment: 10000,
    finalValue: 52000,
    returnPct: 420,
    isProfit: true,
    accentColor: '#F59E0B',
    data: [
      { t: 'Oca 22', v: 10000 },
      { t: 'Mar 22', v: 11500 },
      { t: 'May 22', v: 13200 },
      { t: 'Tem 22', v: 15800 },
      { t: 'Eyl 22', v: 18500 },
      { t: 'Kas 22', v: 22000 },
      { t: 'Oca 23', v: 25500 },
      { t: 'Mar 23', v: 29000 },
      { t: 'May 23', v: 33000 },
      { t: 'Tem 23', v: 38000 },
      { t: 'Eyl 23', v: 35000 },
      { t: 'Kas 23', v: 40000 },
      { t: 'Oca 24', v: 43000 },
      { t: 'Mar 24', v: 47000 },
      { t: 'May 24', v: 45000 },
      { t: 'Tem 24', v: 48000 },
      { t: 'Eyl 24', v: 49500 },
      { t: 'Kas 24', v: 51000 },
      { t: 'Oca 25', v: 50000 },
      { t: 'Mar 25', v: 52000 },
    ],
  },
  {
    symbol: 'TSLA',
    name: 'Tesla',
    exchange: 'NASDAQ',
    buyDate: 'Ocak 2020',
    tagline: 'Efsanevi Ralli',
    investment: 10000,
    finalValue: 19000,
    returnPct: 90,
    isProfit: true,
    accentColor: '#EF4444',
    data: [
      { t: 'Oca 20', v: 10000 },
      { t: 'Mar 20', v: 8500 },
      { t: 'May 20', v: 14000 },
      { t: 'Tem 20', v: 35000 },
      { t: 'Eyl 20', v: 42000 },
      { t: 'Kas 20', v: 68000 },
      { t: 'Oca 21', v: 80000 },
      { t: 'Mar 21', v: 63000 },
      { t: 'May 21', v: 55000 },
      { t: 'Tem 21', v: 65000 },
      { t: 'Eyl 21', v: 72000 },
      { t: 'Kas 21', v: 100000 },
      { t: 'Oca 22', v: 85000 },
      { t: 'Mar 22', v: 75000 },
      { t: 'May 22', v: 55000 },
      { t: 'Tem 22', v: 48000 },
      { t: 'Eyl 22', v: 50000 },
      { t: 'Kas 22', v: 24000 },
      { t: 'Oca 23', v: 22000 },
      { t: 'Mar 23', v: 28000 },
      { t: 'Tem 23', v: 27000 },
      { t: 'Kas 23', v: 26000 },
      { t: 'Oca 24', v: 21000 },
      { t: 'May 24', v: 16500 },
      { t: 'Eyl 24', v: 24000 },
      { t: 'Kas 24', v: 32000 },
      { t: 'Oca 25', v: 28000 },
      { t: 'Mar 25', v: 19000 },
    ],
  },
];

// Multi-stock comparison data (normalized %, Jan 2023 = 100)
const COMPARISON_DATA = [
  { t: 'Oca 23', NVDA: 100, AAPL: 100, TSLA: 100 },
  { t: 'Mar 23', NVDA: 130, AAPL: 108, TSLA: 127 },
  { t: 'May 23', NVDA: 225, AAPL: 115, TSLA: 113 },
  { t: 'Haz 23', NVDA: 280, AAPL: 122, TSLA: 120 },
  { t: 'Eyl 23', NVDA: 255, AAPL: 110, TSLA: 108 },
  { t: 'Ara 23', NVDA: 295, AAPL: 128, TSLA: 118 },
  { t: 'Şub 24', NVDA: 500, AAPL: 125, TSLA: 93 },
  { t: 'May 24', NVDA: 550, AAPL: 130, TSLA: 74 },
  { t: 'Ağu 24', NVDA: 480, AAPL: 148, TSLA: 108 },
  { t: 'Kas 24', NVDA: 580, AAPL: 152, TSLA: 145 },
  { t: 'Oca 25', NVDA: 550, AAPL: 150, TSLA: 127 },
  { t: 'Mar 25', NVDA: 532, AAPL: 160, TSLA: 86 },
];

// ─────────────────────────────────────────
// TICKER
// ─────────────────────────────────────────
const TICKER = [
  { symbol: 'THYAO', change: 2.45, price: '348.20' },
  { symbol: 'GARAN', change: -1.23, price: '112.80' },
  { symbol: 'ASELS', change: 3.67, price: '89.45' },
  { symbol: 'BIST100', change: 0.89, price: '9.842' },
  { symbol: 'EREGL', change: -0.45, price: '56.30' },
  { symbol: 'NVDA', change: 4.21, price: '$134.65' },
  { symbol: 'AAPL', change: 1.82, price: '$224.40' },
  { symbol: 'TSLA', change: -2.14, price: '$288.30' },
  { symbol: 'FROTO', change: 1.92, price: '1.245' },
  { symbol: 'SISE', change: 0.74, price: '52.90' },
];

// ─────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: '#1E222D',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
      }}
    >
      <p style={{ color: '#9598A1', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.stroke || '#00C896', fontWeight: 600 }}>
          {p.name === 'v'
            ? `₺${Number(p.value).toLocaleString('tr-TR')}`
            : `${p.name}: ${p.value}%`}
        </p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────
// DEMO CHART SECTION
// ─────────────────────────────────────────
function DemoSection() {
  const [active, setActive] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const scenario = SCENARIOS[active];
  const profit = scenario.finalValue - scenario.investment;

  const handleSelect = (i: number) => {
    setActive(i);
    setAnimKey((k) => k + 1);
  };

  return (
    <section ref={ref} className="relative py-28 overflow-hidden">
      {/* subtle top separator */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }}
      />

      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span
            style={{ color: '#00C896', letterSpacing: '0.12em' }}
            className="text-xs font-semibold uppercase mb-4 block"
          >
            Canlı Demo
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            ₺10.000 yatırsaydın ne olurdu?
          </h2>
          <p className="text-white/50 max-w-lg mx-auto">
            Gerçek tarihsel verilere dayanan senaryolar. Tarihi seç, sonucu gör.
          </p>
        </motion.div>

        {/* Scenario Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap gap-2 justify-center mb-10"
        >
          {SCENARIOS.map((s, i) => (
            <button
              key={s.symbol}
              onClick={() => handleSelect(i)}
              className="relative px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{
                background: active === i ? 'rgba(0,200,150,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active === i ? 'rgba(0,200,150,0.4)' : 'rgba(255,255,255,0.07)'}`,
                color: active === i ? '#00C896' : '#9598A1',
              }}
            >
              <span className="font-mono font-bold mr-1.5">{s.symbol}</span>
              <span className="opacity-70 font-normal hidden sm:inline">· {s.buyDate}</span>
            </button>
          ))}
        </motion.div>

        {/* Main Demo Panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#131722',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Panel header bar */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: `${scenario.accentColor}20`, color: scenario.accentColor }}
              >
                {scenario.symbol.slice(0, 2)}
              </div>
              <div>
                <span className="text-white font-semibold">{scenario.name}</span>
                <span className="text-white/30 text-sm ml-2">({scenario.exchange})</span>
              </div>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9598A1' }}
              >
                {scenario.tagline}
              </span>
            </div>
            <div className="text-white/30 text-xs hidden sm:block">
              {scenario.buyDate} — Mart 2025 · Tarihsel Veri
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_280px] gap-0">
            {/* Chart */}
            <div className="p-6 pt-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={animKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ height: 280 }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={scenario.data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id={`grad-${scenario.symbol}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={scenario.accentColor} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={scenario.accentColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="0"
                        vertical={false}
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <XAxis
                        dataKey="t"
                        tick={{ fill: '#5D606B', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickFormatter={(v) =>
                          v >= 1000 ? `₺${(v / 1000).toFixed(0)}K` : `₺${v}`
                        }
                        tick={{ fill: '#5D606B', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={52}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                      <Area
                        type="monotone"
                        dataKey="v"
                        name="v"
                        stroke={scenario.accentColor}
                        strokeWidth={2}
                        fill={`url(#grad-${scenario.symbol})`}
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Result Panel */}
            <div
              className="flex flex-col justify-center gap-6 p-8"
              style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={animKey + '-result'}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-6"
                >
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-2">
                      Yatırım
                    </p>
                    <p className="text-white/70 text-xl font-mono font-semibold">
                      ₺10.000
                    </p>
                  </div>

                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-2">
                      Bugünkü Değer
                    </p>
                    <p className="text-white text-3xl font-bold font-mono">
                      <CountUp
                        key={animKey + '-final'}
                        end={scenario.finalValue}
                        separator="."
                        prefix="₺"
                        duration={0.8}
                        useEasing
                      />
                    </p>
                  </div>

                  <div
                    className="rounded-xl p-4"
                    style={{ background: scenario.isProfit ? 'rgba(0,200,150,0.08)' : 'rgba(242,54,69,0.08)' }}
                  >
                    <p
                      className="text-2xl font-bold font-mono"
                      style={{ color: scenario.isProfit ? '#00C896' : '#F23645' }}
                    >
                      {scenario.isProfit ? '+' : '-'}₺
                      <CountUp
                        key={animKey + '-profit'}
                        end={Math.abs(profit)}
                        separator="."
                        duration={0.8}
                        useEasing
                      />
                    </p>
                    <p
                      className="text-sm font-semibold mt-0.5"
                      style={{ color: scenario.isProfit ? '#00C896' : '#F23645' }}
                    >
                      {scenario.isProfit ? '+' : ''}
                      <CountUp
                        key={animKey + '-pct'}
                        end={scenario.returnPct}
                        suffix="%"
                        duration={0.8}
                        useEasing
                      />
                      {' '}getiri
                    </p>
                  </div>

                  <Link to="/register">
                    <button
                      className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                      style={{
                        background: '#00C896',
                        color: '#0B0E11',
                      }}
                    >
                      Kendi Hesabımı Yap
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// COMPARISON CHART SECTION
// ─────────────────────────────────────────
function ComparisonSection() {
  const [range, setRange] = useState<'6M' | '1Y' | 'MAX'>('1Y');
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const sliceMap = { '6M': 6, '1Y': 9, MAX: COMPARISON_DATA.length };
  const data = COMPARISON_DATA.slice(COMPARISON_DATA.length - sliceMap[range]);

  return (
    <section ref={ref} className="relative py-28 overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
      />

      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6"
        >
          <div>
            <span
              style={{ color: '#00C896', letterSpacing: '0.12em' }}
              className="text-xs font-semibold uppercase mb-4 block"
            >
              Karşılaştırma
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">
              Yan yana koy, farkı gör.
            </h2>
            <p className="text-white/50 max-w-md">
              Ocak 2023'te ₺10.000 yatırsaydın — hangi hisse kazandırırdı?
            </p>
          </div>

          {/* Range selector */}
          <div
            className="flex gap-1 p-1 rounded-lg self-start md:self-auto"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {(['6M', '1Y', 'MAX'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200"
                style={{
                  background: range === r ? 'rgba(0,200,150,0.15)' : 'transparent',
                  color: range === r ? '#00C896' : '#5D606B',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="rounded-2xl p-6"
          style={{
            background: '#131722',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid
                  strokeDasharray="0"
                  vertical={false}
                  stroke="rgba(255,255,255,0.04)"
                />
                <XAxis
                  dataKey="t"
                  tick={{ fill: '#5D606B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: '#5D606B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
                <Line
                  type="monotone"
                  dataKey="NVDA"
                  stroke="#00C896"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#00C896' }}
                />
                <Line
                  type="monotone"
                  dataKey="AAPL"
                  stroke="#60A5FA"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#60A5FA' }}
                />
                <Line
                  type="monotone"
                  dataKey="TSLA"
                  stroke="#F87171"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#F87171' }}
                />
              </ReLineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-6 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { symbol: 'NVDA', label: 'NVIDIA', color: '#00C896', ret: '+432%' },
              { symbol: 'AAPL', label: 'Apple', color: '#60A5FA', ret: '+60%' },
              { symbol: 'TSLA', label: 'Tesla', color: '#F87171', ret: '-14%' },
            ].map((item) => (
              <div key={item.symbol} className="flex items-center gap-2">
                <span className="w-6 h-0.5 rounded-full" style={{ background: item.color }} />
                <span className="text-white/60 text-sm">{item.label}</span>
                <span className="text-sm font-mono font-semibold" style={{ color: item.color }}>
                  {item.ret}
                </span>
              </div>
            ))}
            <span className="text-white/25 text-xs self-center ml-auto">
              Ocak 2023 = 100% bazında normalleştirilmiş
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// FEATURES SECTION
// ─────────────────────────────────────────
const FEATURES = [
  {
    icon: LineChart,
    title: 'Gerçek Zamanlı Karşılaştırma',
    desc: 'İki yatırım senaryosunu gerçek verilerle anında karşılaştır. Kaçırdığın fırsatı ve potansiyel kazancını görsel olarak öğren.',
  },
  {
    icon: BarChart2,
    title: 'Tarihsel Portföy Analizi',
    desc: 'Yıllar öncesine git, kararlarını test et. Her yatırım için gerçek performans grafiği ve kar/zarar özeti.',
  },
  {
    icon: Globe,
    title: 'Global & Yerel Piyasalar',
    desc: 'BIST, NYSE, NASDAQ — tüm büyük borsaları tek platformdan takip et. 50.000+ hisse senedi desteği.',
  },
  {
    icon: Search,
    title: 'Akıllı Hisse Arama',
    desc: 'İsim ya da sembole göre anında bul. Sektör filtresi, piyasa değeri ve performans metrikleriyle rafine et.',
  },
  {
    icon: Shield,
    title: 'Güvenli Altyapı',
    desc: 'JWT kimlik doğrulama, şifreli veri iletimi. Verilerinin güvenliği bizim önceliğimiz.',
  },
  {
    icon: Zap,
    title: 'Anlık Hesaplama',
    desc: 'Saniyeler içinde sonuç. Yavaş yükleme yok, karmaşık ayar yok. Sadece gir, hesapla, gör.',
  },
];

function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="relative py-28">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
      />

      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span
            style={{ color: '#00C896', letterSpacing: '0.12em' }}
            className="text-xs font-semibold uppercase mb-4 block"
          >
            Özellikler
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Her şey tek platformda.
          </h2>
          <p className="text-white/50 max-w-lg mx-auto">
            Yatırım kararlarını güçlendirmek için ihtiyacın olan her araç burada.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="group rounded-xl p-6 transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,200,150,0.25)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,200,150,0.04)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)';
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: 'rgba(0,200,150,0.1)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: '#00C896' }} />
                </div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// HOW IT WORKS
// ─────────────────────────────────────────
function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const steps = [
    {
      n: '01',
      title: 'Hisseyi Seç',
      desc: 'Dünya borsalarında arama yap. BIST, NYSE, NASDAQ — tüm piyasalar.',
    },
    {
      n: '02',
      title: 'Tarihi Belirle',
      desc: 'Ne zaman alsaydın? Yıllar öncesine kadar herhangi bir tarihe gidebilirsin.',
    },
    {
      n: '03',
      title: 'Sonucu Gör',
      desc: 'Kazanç, kayıp ve grafiksel gösterimle tüm hikaye önüne gelir.',
    },
  ];

  return (
    <section ref={ref} className="relative py-28">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
      />

      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span
            style={{ color: '#00C896', letterSpacing: '0.12em' }}
            className="text-xs font-semibold uppercase mb-4 block"
          >
            Nasıl Çalışır
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            3 adımda keşfet.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* connector line */}
          <div
            className="hidden md:block absolute top-8 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px"
            style={{ background: 'linear-gradient(90deg, rgba(0,200,150,0.4), rgba(0,200,150,0.1), rgba(0,200,150,0.4))' }}
          />

          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: i * 0.12 }}
              className="text-center"
            >
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center relative z-10"
                style={{
                  background: '#1E222D',
                  border: '1px solid rgba(0,200,150,0.3)',
                }}
              >
                <span
                  className="text-2xl font-bold font-mono"
                  style={{ color: '#00C896' }}
                >
                  {s.n}
                </span>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// STATS BAR
// ─────────────────────────────────────────
function StatsBar() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  const stats = [
    { value: 340000, suffix: '+', label: 'Kullanıcı', prefix: '' },
    { value: 2.4, suffix: ' Milyar+', label: 'TL Hesaplandı', prefix: '₺' },
    { value: 50000, suffix: '+', label: 'Hisse Senedi', prefix: '' },
    { value: 99.9, suffix: '%', label: 'Uptime', prefix: '' },
  ];

  return (
    <section ref={ref} className="relative py-20">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
      />

      <div className="container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="text-center"
            >
              <div
                className="text-3xl md:text-4xl font-bold font-mono mb-1"
                style={{ color: '#00C896' }}
              >
                {inView && (
                  <>
                    {s.prefix}
                    <CountUp
                      end={s.value}
                      decimals={s.value < 10 ? 1 : 0}
                      duration={1.5}
                      separator="."
                      useEasing
                    />
                    {s.suffix}
                  </>
                )}
              </div>
              <div className="text-white/40 text-sm">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function LandingPage() {
  const [navSolid, setNavSolid] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (v) => {
    setNavSolid(v > 60);
  });

  // Hero chart data (NVDA 2023 normalized)
  const heroData = SCENARIOS[0].data.slice(-16);

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: '#0B0E11', color: '#D1D4DC' }}
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse at 50% 0%, black 40%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black 40%, transparent 80%)',
        }}
      />

      {/* Subtle green glow at top */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] pointer-events-none"
        style={{
          boxShadow: '0 0 120px 60px rgba(0,200,150,0.08)',
        }}
      />

      {/* ── TICKER ── */}
      <div
        className="relative z-20 overflow-hidden py-2.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(11,14,17,0.8)' }}
      >
        <div
          className="flex whitespace-nowrap"
          style={{ animation: 'ticker 40s linear infinite' }}
        >
          {[...TICKER, ...TICKER, ...TICKER].map((item, i) => (
            <div key={i} className="flex items-center gap-2 px-5">
              <span className="font-mono text-white/60 text-xs font-semibold">{item.symbol}</span>
              <span className="font-mono text-xs font-medium" style={{ color: '#5D606B' }}>
                {item.price}
              </span>
              <span
                className="flex items-center gap-0.5 text-xs font-semibold"
                style={{ color: item.change > 0 ? '#00C896' : '#F23645' }}
              >
                {item.change > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {item.change > 0 ? '+' : ''}
                {item.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── NAVBAR ── */}
      <motion.nav
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="sticky top-0 z-30 transition-all duration-300"
        style={{
          background: navSolid ? 'rgba(11,14,17,0.92)' : 'transparent',
          backdropFilter: navSolid ? 'blur(20px)' : 'none',
          borderBottom: navSolid ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        }}
      >
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.3)' }}
              >
                <TrendingUp className="w-4 h-4" style={{ color: '#00C896' }} />
              </div>
              <span className="font-bold text-white text-sm tracking-tight">Keşke Alsaydım</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {[
                ['Demo', '#demo'],
                ['Özellikler', '#features'],
                ['Nasıl Çalışır', '#how'],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="text-sm transition-colors duration-200"
                  style={{ color: '#787B86' }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#D1D4DC')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#787B86')}
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link to="/login">
                <button
                  className="text-sm px-4 py-2 rounded-lg transition-all duration-200"
                  style={{ color: '#787B86' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget.style.color = '#D1D4DC');
                    (e.currentTarget.style.background = 'rgba(255,255,255,0.04)');
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget.style.color = '#787B86');
                    (e.currentTarget.style.background = 'transparent');
                  }}
                >
                  Giriş Yap
                </button>
              </Link>
              <Link to="/register">
                <button
                  className="text-sm px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5"
                  style={{
                    background: '#00C896',
                    color: '#0B0E11',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget.style.background = '#00B588'))}
                  onMouseLeave={(e) => ((e.currentTarget.style.background = '#00C896'))}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Başla
                </button>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ── HERO ── */}
      <section className="relative container mx-auto px-4 max-w-6xl pt-20 pb-8">
        <div className="grid lg:grid-cols-[1fr_520px] gap-12 items-center min-h-[calc(100vh-120px)]">
          {/* Left */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="inline-flex items-center gap-2 mb-8 px-3.5 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: 'rgba(0,200,150,0.08)',
                border: '1px solid rgba(0,200,150,0.2)',
                color: '#00C896',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#00C896', boxShadow: '0 0 6px #00C896' }}
              />
              Yapay Zeka Destekli Analiz
            </motion.div>

            <motion.h1
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.08] mb-6"
            >
              Ya o hisseyi
              <br />
              gerçekten{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #00C896, #60A5FA)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                alsaydın?
              </span>
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="text-lg mb-10 leading-relaxed max-w-md"
              style={{ color: '#787B86' }}
            >
              Geçmişe dön, istediğin tarihi seç ve ne kadar{' '}
              <span style={{ color: '#D1D4DC' }}>kazanacağını saniyeler içinde</span> gör.
              Gerçek verilerle, gerçek hesaplama.
            </motion.p>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="flex flex-wrap gap-3"
            >
              <Link to="/register">
                <button
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all duration-200"
                  style={{ background: '#00C896', color: '#0B0E11' }}
                  onMouseEnter={(e) => ((e.currentTarget.style.background = '#00B588'))}
                  onMouseLeave={(e) => ((e.currentTarget.style.background = '#00C896'))}
                >
                  Ücretsiz Dene
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <a href="#demo">
                <button
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#D1D4DC',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget.style.background = 'rgba(255,255,255,0.07)'))}
                  onMouseLeave={(e) => ((e.currentTarget.style.background = 'rgba(255,255,255,0.04)'))}
                >
                  Demoyu Gör
                  <ChevronDown className="w-4 h-4" />
                </button>
              </a>
            </motion.div>

            {/* Social proof */}
            <motion.div
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-4 mt-10"
            >
              <div className="flex -space-x-2">
                {['AY', 'MK', 'ZD', 'EK'].map((initials, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ring-2"
                    style={{
                      background: `hsl(${i * 60 + 140}, 60%, 40%)`,
                      color: 'white',
                      outline: '2px solid #0B0E11',
                    }}
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <p className="text-xs" style={{ color: '#5D606B' }}>
                <span style={{ color: '#D1D4DC' }}>340.000+</span> yatırımcı
                tarafından kullanılıyor
              </p>
            </motion.div>
          </motion.div>

          {/* Right – Chart panel */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: '#131722',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
              }}
            >
              {/* Window chrome */}
              <div
                className="flex items-center gap-3 px-5 py-3.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FFBD2E' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }} />
                </div>
                <div
                  className="flex items-center gap-2 px-3 py-1 rounded-md text-xs"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#5D606B' }}
                >
                  <Search className="w-3 h-3" />
                  NVDA · Ocak 2023'ten bugüne
                </div>
              </div>

              {/* Stock info row */}
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white font-semibold">NVIDIA</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#5D606B' }}
                    >
                      NASDAQ
                    </span>
                  </div>
                  <span className="text-2xl font-bold font-mono text-white">₺53.200</span>
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(0,200,150,0.1)' }}
                >
                  <ArrowUpRight className="w-4 h-4" style={{ color: '#00C896' }} />
                  <span className="font-bold font-mono text-sm" style={{ color: '#00C896' }}>
                    +432%
                  </span>
                </div>
              </div>

              {/* Chart */}
              <div className="px-2 pb-4" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={heroData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00C896" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#00C896" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis hide />
                    <YAxis hide />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="#00C896"
                      strokeWidth={1.5}
                      fill="url(#heroGrad)"
                      dot={false}
                      isAnimationActive
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Bottom stats */}
              <div
                className="grid grid-cols-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                {[
                  { label: 'Alış Tarihi', value: 'Oca 2023' },
                  { label: 'Yatırım', value: '₺10.000' },
                  { label: 'Bugün', value: '₺53.200' },
                ].map((s) => (
                  <div key={s.label} className="p-4 text-center" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#5D606B' }}>
                      {s.label}
                    </div>
                    <div className="text-white font-mono font-semibold text-sm">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 1, type: 'spring', stiffness: 200 }}
              className="absolute -bottom-5 -left-6 rounded-xl px-4 py-3 flex items-center gap-3"
              style={{
                background: '#1E222D',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(0,200,150,0.12)' }}
              >
                <TrendingUp className="w-4 h-4" style={{ color: '#00C896' }} />
              </div>
              <div>
                <div className="text-white text-xs font-semibold">THYAO +420%</div>
                <div className="text-[10px]" style={{ color: '#5D606B' }}>
                  2022'den bu yana
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex flex-col items-center gap-2 pb-8"
          style={{ color: '#3D4046' }}
        >
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── SECTIONS ── */}
      <div id="demo">
        <DemoSection />
      </div>

      <StatsBar />

      <div id="features">
        <FeaturesSection />
      </div>

      <div id="how">
        <HowItWorksSection />
      </div>

      <ComparisonSection />

      {/* ── CTA ── */}
      <section className="relative py-32">
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,200,150,0.3), transparent)',
          }}
        />

        <div className="container mx-auto px-4 max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-white/30 text-sm mb-4 uppercase tracking-widest">
              Geçmişi değiştiremezsin
            </p>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Ama{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #00C896, #60A5FA)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                hesaplayabilirsin.
              </span>
            </h2>
            <p className="text-white/40 mb-10 max-w-md mx-auto leading-relaxed">
              Ücretsiz hesap oluştur, kendi senaryolarını dene. Kredi kartı gerekmez.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <button
                  className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200"
                  style={{ background: '#00C896', color: '#0B0E11' }}
                  onMouseEnter={(e) => ((e.currentTarget.style.background = '#00B588'))}
                  onMouseLeave={(e) => ((e.currentTarget.style.background = '#00C896'))}
                >
                  <Sparkles className="w-4 h-4" />
                  Ücretsiz Başla
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link to="/login">
                <button
                  className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#D1D4DC',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget.style.background = 'rgba(255,255,255,0.07)'))}
                  onMouseLeave={(e) => ((e.currentTarget.style.background = 'rgba(255,255,255,0.04)'))}
                >
                  Giriş Yap
                </button>
              </Link>
            </div>

            {/* Features bullets */}
            <div className="flex flex-wrap justify-center gap-6 mt-10">
              {['Ücretsiz hesap', 'Gerçek veriler', 'Anlık hesaplama', 'Güvenli altyapı'].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm" style={{ color: '#5D606B' }}>
                  <Check className="w-3.5 h-3.5" style={{ color: '#00C896' }} />
                  {f}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ─�� */}
      <footer
        className="relative py-12"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="max-w-xs">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.2)' }}
                >
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: '#00C896' }} />
                </div>
                <span className="font-bold text-white text-sm">Keşke Alsaydım</span>
              </Link>
              <p className="text-xs leading-relaxed" style={{ color: '#5D606B' }}>
                Yatırım kararlarını tarihsel verilerle güçlendiren analiz platformu.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-8 text-sm">
              {[
                {
                  title: 'Ürün',
                  links: ['Özellikler', 'Fiyatlar', 'API', 'Değişiklik Günlüğü'],
                },
                {
                  title: 'Şirket',
                  links: ['Hakkımızda', 'Blog', 'Kariyer', 'Basın'],
                },
                {
                  title: 'Destek',
                  links: ['Yardım', 'İletişim', 'Gizlilik', 'Şartlar'],
                },
              ].map((col) => (
                <div key={col.title}>
                  <p className="font-semibold text-white/60 mb-3 text-xs uppercase tracking-wider">
                    {col.title}
                  </p>
                  <ul className="space-y-2">
                    {col.links.map((l) => (
                      <li key={l}>
                        <a
                          href="#"
                          className="text-xs transition-colors duration-150"
                          style={{ color: '#5D606B' }}
                          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#9598A1')}
                          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#5D606B')}
                        >
                          {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div
            className="flex flex-col md:flex-row justify-between items-center gap-4 mt-10 pt-8"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-xs" style={{ color: '#3D4046' }}>
              © 2026 Keşke Alsaydım. Tüm hakları saklıdır.
            </p>
            <p className="text-xs" style={{ color: '#3D4046' }}>
              Veriler yalnızca bilgilendirme amaçlıdır. Yatırım tavsiyesi değildir.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

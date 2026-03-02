import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
} from 'framer-motion';
import {
  ArrowRight,
  BarChart2,
  ChevronDown,
  Clock3,
  GitCompare,
  LineChart,
  Search,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import CountUp from 'react-countup';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BrandLogo } from '@/components/BrandLogo';
import { COMPARISON_DATA, SCENARIOS } from '@/lib/landingData';
import { stockService } from '@/services/stockService';

const NAV_ITEMS = [
  { label: 'Demo', href: '#demo' },
  { label: 'Özellikler', href: '#features' },
  { label: 'Nasıl Çalışır', href: '#how' },
  { label: 'Karşılaştır', href: '#compare' },
];

const FEATURES = [
  {
    icon: GitCompare,
    title: 'Canlı Karşılaştırma',
    desc: 'İki hisseyi aynı anda aç. Sonucu tek grafikte net biçimde gör.',
  },
  {
    icon: LineChart,
    title: 'Tarihsel Senaryo',
    desc: 'İstediğin tarihe dön. Bugünkü değeri sade bir özetle yakala.',
  },
  {
    icon: Shield,
    title: 'Temiz Deneyim',
    desc: 'Gereksiz katman yok. Veriye odaklanan sakin ve güvenli bir akış var.',
  },
  {
    icon: Zap,
    title: 'Mobilde Güçlü',
    desc: 'Tüm düzen mobilde de aynı netlikle akar. Kartlar temizce istiflenir.',
  },
];

const RANGE_MONTHS: Record<'1M' | '3M' | '6M' | '1Y', number> = {
  '1M': 1,
  '3M': 3,
  '6M': 6,
  '1Y': 12,
};

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const CMP_COLORS = { A: '#22c55e', B: '#38bdf8' };
const PANEL_STYLE = {
  background: 'rgba(8, 15, 21, 0.82)',
  border: '1px solid rgba(148, 163, 184, 0.10)',
  boxShadow: '0 22px 72px rgba(2, 12, 17, 0.34)',
};
const PANEL_INNER_STYLE = {
  background: 'rgba(255, 255, 255, 0.025)',
  border: '1px solid rgba(148, 163, 184, 0.10)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.016)',
};

interface StockSel {
  symbol: string;
  name: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

interface CmpPoint {
  label: string;
  A: number;
  B: number;
}

type ClosePoint = { date: string; close: number };

function toClosePoints(data: { date: string; close: number; adjustedClose: number }[]): ClosePoint[] {
  return data.map((point) => ({ date: point.date, close: point.adjustedClose || point.close }));
}

function buildNormalizedChartData(historyA: ClosePoint[], historyB: ClosePoint[]): CmpPoint[] {
  if (!historyA.length || !historyB.length) {
    return [];
  }

  const baseA = historyA[0].close;
  const baseB = historyB[0].close;
  const mapB = new Map(historyB.map((point) => [point.date, point.close]));

  const normalized = historyA.flatMap((pointA) => {
    const closeB = mapB.get(pointA.date);
    if (closeB === undefined) {
      return [];
    }

    return [{
      label: fmtMonth(pointA.date),
      A: Number.parseFloat(((pointA.close / baseA) * 100).toFixed(2)),
      B: Number.parseFloat(((closeB / baseB) * 100).toFixed(2)),
    }];
  });

  return normalized.filter((_, index) => (
    index === 0 || index === normalized.length - 1 || index % Math.max(1, Math.floor(normalized.length / 8)) === 0
  ));
}

function fmtMonth(date: string) {
  const dt = new Date(date);
  return `${TR_MONTHS[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}`;
}

function getRangeFrom(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className="rounded-2xl border border-white/10 bg-[#0b141b]/95 px-4 py-3 text-xs shadow-2xl"
      style={{ boxShadow: '0 20px 40px rgba(2, 12, 17, 0.45)' }}
    >
      <p className="mb-2 text-slate-400">{label}</p>
      {payload.map((item: any) => (
        <p key={item.dataKey} className="font-semibold" style={{ color: item.stroke || '#22c55e' }}>
          {item.name === 'v'
            ? `₺${Number(item.value).toLocaleString('tr-TR')}`
            : `${item.name}: ${item.value}%`}
        </p>
      ))}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  aside,
}: Readonly<{
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  align?: 'center' | 'left';
  aside?: ReactNode;
}>) {
  const baseClass =
    aside != null
      ? 'mb-6 flex flex-col gap-5 lg:mb-8 lg:flex-row lg:items-end lg:justify-between'
      : align === 'left'
        ? 'mb-6 max-w-2xl lg:mb-8'
        : 'mb-8 mx-auto max-w-4xl text-center lg:mb-10';

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className={baseClass}
    >
      <div className={align === 'left' ? 'max-w-2xl' : undefined}>
        <span className="label-brand mb-5 block text-xs font-semibold uppercase tracking-[0.24em] sm:mb-6">
          {eyebrow}
        </span>
        <h2 className="max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl md:leading-[1.02]">
          {title}
        </h2>
        {align === 'center' && aside == null ? (
          <div className="mt-6 flex items-center justify-center gap-4 sm:mt-7 sm:gap-5">
            <div className="h-px w-10 bg-gradient-to-r from-transparent via-primary/80 to-primary/20 sm:w-16" />
            <p className="max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">{description}</p>
          </div>
        ) : (
          <>
            <div className="mt-5 h-px w-24 bg-gradient-to-r from-primary via-secondary to-transparent sm:mt-6" />
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:mt-6 sm:text-base">{description}</p>
          </>
        )}
      </div>
      {aside}
    </motion.div>
  );
}

function SectionAtmosphere({ stars = false }: Readonly<{ stars?: boolean }>) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-x-[10%] top-0 h-44 blur-3xl"
        style={{ background: 'radial-gradient(circle at top, rgba(34, 197, 94, 0.16) 0%, transparent 72%)' }}
      />
      <div
        className="absolute inset-x-[24%] top-16 h-36 blur-3xl"
        style={{ background: 'radial-gradient(circle at top, rgba(56, 189, 248, 0.12) 0%, transparent 74%)' }}
      />
      {stars && (
        <>
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.75) 1px, transparent 1.5px), radial-gradient(circle, rgba(34,197,94,0.5) 1px, transparent 1.8px)',
              backgroundPosition: '0 0, 28px 18px',
              backgroundSize: '110px 110px, 170px 170px',
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 25%, rgba(34, 197, 94, 0.18) 0%, transparent 22%), radial-gradient(circle at 78% 18%, rgba(56, 189, 248, 0.14) 0%, transparent 20%), radial-gradient(circle at 50% 70%, rgba(255, 255, 255, 0.08) 0%, transparent 24%)',
            }}
          />
        </>
      )}
    </div>
  );
}

function SectionDivider() {
  return (
    <div className="relative py-3 sm:py-4">
      <motion.div
        initial={{ opacity: 0, scaleX: 0.7 }}
        whileInView={{ opacity: 1, scaleX: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.55 }}
        className="mx-auto h-px max-w-5xl origin-center bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-px w-28 -translate-y-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent"
        animate={{ x: ['-220%', '220%'], opacity: [0, 0.85, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(34, 197, 94, 0.16) 0%, transparent 72%)' }}
      />
    </div>
  );
}

function NvidiaMark() {
  return (
    <span className="inline-flex h-8 min-w-9 items-center justify-center rounded-xl bg-white px-2 ring-1 ring-white/10">
      <img
        src="https://www.citypng.com/public/uploads/preview/hd-nvidia-eye-logo-icon-png-701751694965655t2lbe7yugk.png?v=2025091511"
        alt="NVIDIA logo"
        className="h-6 w-auto object-contain"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </span>
  );
}

function AppleMark() {
  return (
    <span className="inline-flex h-8 w-9 items-center justify-center rounded-xl bg-white px-2 ring-1 ring-white/10">
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
        alt="Apple"
        className="h-6 w-auto object-contain"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </span>
  );
}

function HeroSection() {
  const heroData = COMPARISON_DATA;
  const heroChartData = heroData.map((point) => ({
    t: point.t,
    NVDA: point.NVDA - 100,
    AAPL: point.AAPL - 100,
  }));
  const heroLeaders = [
    { symbol: 'NVDA', label: 'NVIDIA', ret: 855, color: '#22c55e' },
    { symbol: 'AAPL', label: 'Apple', ret: 91, color: '#38bdf8' },
  ];
  const heroGap = heroLeaders[0].ret - heroLeaders[1].ret;

  return (
    <section className="relative">
      <div className="mx-auto max-w-[1340px] px-4 pb-10 pt-7 sm:px-6 lg:px-8 lg:pb-14 lg:pt-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.14fr)] lg:items-center lg:gap-12 xl:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="mx-auto max-w-[34rem] text-center sm:text-left lg:mx-0"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-[0_0_24px_rgba(34,197,94,0.08)]">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_rgba(34,197,94,0.7)]" />
              "Keşke Alsaydım?" Sorusuna Net Cevap
            </div>

            <h1 className="mx-auto max-w-[10.5ch] pb-2 text-[2.7rem] font-semibold leading-[1.01] tracking-tight text-white sm:text-[3.45rem] sm:leading-[0.99] lg:mx-0 lg:text-[4.35rem]">
              Ya O Hisseyi
              <span className="block pb-[0.08em] text-gradient">Gerçekten Alsaydın?</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-[0.98rem] leading-8 text-slate-400 sm:text-[1.04rem] lg:mx-0">
              Bir tarih seç ve o gün yatırım yapsaydın bugün nereye geleceğini tek ekranda gör.
              <span className="mt-1 block text-slate-300">İki hisseyi yan yana aç, farkı net biçimde karşılaştır.</span>
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-primary px-6 py-3.5 text-[0.98rem] font-semibold text-slate-950 transition hover:bg-primary/90"
              >
                Ücretsiz Dene
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.04] px-6 py-3.5 text-[0.98rem] font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                Demoyu Gör
                <ChevronDown className="h-4 w-4" />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="relative lg:w-full lg:justify-self-end"
          >
            <motion.div
              className="pointer-events-none absolute -right-8 -top-6 h-28 w-28 rounded-full blur-3xl"
              animate={{ opacity: [0.12, 0.24, 0.12], scale: [0.92, 1.05, 0.95] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ background: 'radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, transparent 72%)' }}
            />
            <motion.div
              className="pointer-events-none absolute -left-8 bottom-10 h-24 w-24 rounded-full blur-3xl"
              animate={{ opacity: [0.08, 0.18, 0.08], scale: [0.96, 1.08, 0.97] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
              style={{ background: 'radial-gradient(circle, rgba(34, 197, 94, 0.13) 0%, transparent 72%)' }}
            />
            <div
              className="relative overflow-hidden rounded-[28px] p-4 sm:p-5"
              style={{
                ...PANEL_STYLE,
                background:
                  'linear-gradient(180deg, rgba(10, 18, 25, 0.96) 0%, rgba(8, 15, 21, 0.82) 100%)',
              }}
            >
              <div className="border-b border-white/8 pb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Karşılaştırma Önizleme</p>
                  <p className="mt-3 text-[2rem] font-semibold tracking-tight text-white sm:text-[2.35rem]">NVDA ve AAPL</p>
                  <p className="mt-2 text-sm text-slate-400 sm:text-base">Ocak 2023 sonrası normalize karşılaştırma</p>
                </div>
              </div>

              <div className="relative mt-4 overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,24,34,0.9),rgba(9,15,21,0.76))] p-4 sm:p-5">
                <motion.div
                  className="pointer-events-none absolute left-10 right-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
                  animate={{ opacity: [0.14, 0.4, 0.14] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                />

                <div className="mb-4 flex flex-col gap-4 border-b border-white/8 pb-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2.5">
                    {heroLeaders.map((item) => (
                      <div
                        key={item.symbol}
                        className="flex items-center gap-2.5 text-base text-slate-200"
                      >
                        {item.symbol === 'NVDA' ? <NvidiaMark /> : <AppleMark />}
                        <span className="font-mono font-semibold" style={{ color: item.color }}>{item.symbol}</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-200">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="w-fit whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 sm:text-base">
                    Ocak 2023 → Aralık 2025
                  </div>
                </div>

                <div className="h-[16rem] sm:h-[18rem] lg:h-[19rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReLineChart data={heroChartData} margin={{ top: 6, right: 8, bottom: 0, left: -6 }}>
                      <CartesianGrid vertical={false} stroke="rgba(148, 163, 184, 0.08)" />
                      <XAxis
                        dataKey="t"
                        axisLine={false}
                        tickLine={false}
                        minTickGap={28}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        width={34}
                        domain={[0, 'dataMax + 30']}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(148, 163, 184, 0.18)' }} />
                      <Line type="monotone" dataKey="NVDA" name="NVDA" stroke="#22c55e" strokeWidth={2.8} dot={false} />
                      <Line type="monotone" dataKey="AAPL" name="AAPL" stroke="#38bdf8" strokeWidth={2.8} dot={false} />
                    </ReLineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  {[
                    { label: 'NVDA', value: `+${heroLeaders[0].ret}%`, color: '#22c55e' },
                    { label: 'APPLE', value: `+${heroLeaders[1].ret}%`, color: '#38bdf8' },
                    { label: 'Fark', value: `+${heroGap}%`, color: '#f59e0b' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[18px] border border-white/10 bg-black/10 px-3 py-3 sm:px-3.5 sm:py-3.5">
                      <p
                        className="text-[10px] uppercase tracking-[0.22em] sm:text-[11px]"
                        style={{ color: item.color }}
                      >
                        {item.label}
                      </p>
                      <p
                        className="mt-1.5 font-mono text-sm font-semibold sm:mt-2 sm:text-[0.95rem]"
                        style={{ color: item.color }}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  const [active, setActive] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const scenario = SCENARIOS[active];
  const profit = scenario.finalValue - scenario.investment;

  const handleSelect = (index: number) => {
    setActive(index);
    setAnimKey((current) => current + 1);
  };

  return (
    <section ref={ref} id="demo" className="relative overflow-hidden py-10 sm:py-12 lg:py-14">
      <SectionAtmosphere />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Canlı Demo"
          title={
            <>
              Tek Senaryo
              <span className="block text-gradient">Net Sonuç</span>
            </>
          }
          description="Bir tarih seç, bugünkü değeri, toplam getiriyi ve farkı aynı ekranda gör."
        />

        <div className="mb-5 flex justify-start gap-2 overflow-x-auto pb-1 no-scrollbar sm:mb-6 sm:justify-center">
          {SCENARIOS.map((item, index) => (
            <button
              key={item.symbol}
              onClick={() => handleSelect(index)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition sm:px-5 ${
                active === index
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              <span className="font-mono font-semibold">{item.symbol}</span>
              <span className="ml-2 hidden text-xs sm:inline">{item.buyDate}</span>
            </button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="relative overflow-hidden rounded-[32px]"
          style={{
            ...PANEL_STYLE,
            background:
              'radial-gradient(circle at top, rgba(34, 197, 94, 0.08), transparent 36%), linear-gradient(180deg, rgba(8, 15, 21, 0.92) 0%, rgba(8, 15, 21, 0.82) 100%)',
          }}
        >
          <div className="pointer-events-none absolute inset-x-24 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_352px]">
            <div className="p-4 sm:p-6 lg:p-7">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4 lg:mb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xl font-semibold text-white sm:text-[1.9rem]">{scenario.name}</p>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400">
                      {scenario.exchange}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ background: `${scenario.accentColor}20`, color: scenario.accentColor }}
                    >
                      {scenario.tagline}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{scenario.buyDate} - Aralık 2025 arası tarihsel veri</p>
                </div>
                <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Getiri</p>
                  <p className="mt-1 font-mono text-lg font-semibold" style={{ color: scenario.accentColor }}>
                    +{scenario.returnPct}%
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,20,28,0.96),rgba(9,15,21,0.82))] p-4 sm:p-5">
                <motion.div
                  className="pointer-events-none absolute left-10 right-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
                  animate={{ opacity: [0.12, 0.34, 0.12] }}
                  transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="h-[15.75rem] sm:h-[19rem] lg:h-[21rem]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={animKey}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="h-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={scenario.data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id={`demo-${scenario.symbol}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={scenario.accentColor} stopOpacity={0.28} />
                              <stop offset="95%" stopColor={scenario.accentColor} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} stroke="rgba(148, 163, 184, 0.07)" />
                          <XAxis
                            dataKey="t"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickMargin={10}
                            minTickGap={26}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            width={42}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickCount={4}
                            tickFormatter={(value) => `₺${Math.round(value / 1000)}K`}
                          />
                          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(148, 163, 184, 0.18)' }} />
                          <Area
                            type="monotone"
                            dataKey="v"
                            name="v"
                            stroke={scenario.accentColor}
                            strokeWidth={2.4}
                            fill={`url(#demo-${scenario.symbol})`}
                            dot={false}
                            isAnimationActive
                            animationDuration={800}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="mt-4 rounded-[22px] border border-white/[0.08] bg-black/10 px-4 py-3.5 sm:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[11px] font-semibold text-slate-950"
                        style={{ background: scenario.accentColor }}
                      >
                        {scenario.symbol.slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-white">
                          {scenario.symbol}
                          <span className="ml-2 font-normal text-slate-400">{scenario.buyDate}</span>
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm text-slate-400">Tek bakışta senaryo</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-black/10 p-4 sm:p-6 lg:border-l lg:border-t-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${animKey}-summary`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="ml-auto w-fit rounded-[24px] border border-white/[0.08] bg-white/[0.025] px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Getiri</p>
                    <p className="mt-2 font-mono text-2xl font-semibold" style={{ color: scenario.accentColor }}>
                      +{scenario.returnPct}%
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Yatırım</p>
                    <p className="mt-3 font-mono text-2xl font-semibold text-white">₺10.000</p>
                  </div>

                  <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Bugünkü değer</p>
                    <p className="mt-3 font-mono text-3xl font-semibold text-white">
                      <CountUp end={scenario.finalValue} separator="." prefix="₺" duration={0.7} />
                    </p>
                  </div>

                  <div
                    className="rounded-[24px] p-4 sm:p-5"
                    style={{
                      background: scenario.isProfit ? 'rgba(34, 197, 94, 0.10)' : 'rgba(248, 113, 113, 0.10)',
                      border: `1px solid ${scenario.isProfit ? 'rgba(34, 197, 94, 0.18)' : 'rgba(248, 113, 113, 0.18)'}`,
                    }}
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Toplam fark</p>
                    <p
                      className="mt-3 font-mono text-3xl font-semibold"
                      style={{ color: scenario.isProfit ? '#22c55e' : '#f87171' }}
                    >
                      {scenario.isProfit ? '+' : '-'}₺
                      <CountUp end={Math.abs(profit)} separator="." duration={0.7} />
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: scenario.isProfit ? '#22c55e' : '#f87171' }}>
                      {scenario.isProfit ? '+' : ''}
                      <CountUp end={scenario.returnPct} suffix="%" duration={0.7} />
                      {' '}getiri
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-4 text-sm leading-7 text-slate-400 sm:p-5">
                    Tek bakışta sonucu gör. Akış kısa, mesaj nettir.
                  </div>

                  <Link
                    to="/register"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-primary px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-primary/90"
                  >
                    Kendi Hesabımı Hesapla
                    <ArrowRight className="h-4 w-4" />
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

function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} id="features" className="relative overflow-hidden py-10 sm:py-12 lg:py-14">
      <SectionAtmosphere stars />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Özellikler"
          title={
            <>
              Sade Görünüm
              <span className="block text-gradient">Kolay Anlaşılır</span>
            </>
          }
          description="Tasarım dikkat dağıtmaz. Veriyi öne çıkarır ve mobilde de aynı netliği korur."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="group relative overflow-hidden rounded-[28px] p-5 transition hover:-translate-y-1 sm:p-7"
                style={{
                  ...PANEL_INNER_STYLE,
                  background:
                    'linear-gradient(180deg, rgba(8, 15, 21, 0.86) 0%, rgba(8, 15, 21, 0.72) 100%)',
                }}
              >
                <motion.div
                  className="pointer-events-none absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
                  animate={{ opacity: [0.1, 0.32, 0.1] }}
                  transition={{ duration: 3 + index * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div
                  className="pointer-events-none absolute bottom-0 left-1/2 h-12 w-28 -translate-x-1/2 blur-2xl"
                  style={{ background: 'radial-gradient(circle, rgba(34, 197, 94, 0.13) 0%, transparent 72%)' }}
                />
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-[1.42rem] font-semibold tracking-tight text-white sm:text-[1.7rem]">{item.title}</h3>
                <p className="mt-4 max-w-[18rem] text-[0.97rem] leading-8 text-slate-400 sm:text-base sm:leading-9">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const steps = [
    {
      id: '01',
      icon: Search,
      title: 'Hisseyi Seç',
      desc: 'Arama kutusuna sembol ya da isim yaz. Sonuçlar hızlıca gelsin.',
    },
    {
      id: '02',
      icon: Clock3,
      title: 'Tarihi Belirle',
      desc: 'Geçmişe dön ve hangi günden itibaren bakacağını seç.',
    },
    {
      id: '03',
      icon: BarChart2,
      title: 'Sonucu Gör',
      desc: 'Getiri, grafik ve özet kartı aynı blokta dursun.',
    },
  ];

  return (
    <section ref={ref} id="how" className="relative overflow-hidden py-10 sm:py-12 lg:py-14">
      <SectionAtmosphere stars />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Nasıl Çalışır"
          title={
            <>
              Kısa Akış
              <span className="block text-gradient">Hızlı Sonuç</span>
            </>
          }
          description="Arama, tarih ve sonuç tek ritimde ilerler. Kullanıcı hiçbir yerde kaybolmaz."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="group relative overflow-hidden rounded-[30px] p-5 sm:p-7"
                style={{
                  ...PANEL_INNER_STYLE,
                  background:
                    'linear-gradient(180deg, rgba(8, 15, 21, 0.88) 0%, rgba(8, 15, 21, 0.72) 100%)',
                }}
              >
                <motion.div
                  className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
                  animate={{ opacity: [0.1, 0.34, 0.1] }}
                  transition={{ duration: 2.8 + index * 0.22, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div
                  className="pointer-events-none absolute bottom-0 left-1/2 h-12 w-32 -translate-x-1/2 blur-2xl"
                  style={{ background: 'radial-gradient(circle, rgba(34, 197, 94, 0.13) 0%, transparent 72%)' }}
                />
                <div className="mb-8 flex items-center justify-between">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[1.45rem] font-semibold text-slate-500 sm:text-2xl">{step.id}</span>
                </div>
                <h3 className="text-[1.65rem] font-semibold tracking-tight text-white sm:text-[2rem]">{step.title}</h3>
                <p className="mt-4 max-w-[20rem] text-[0.97rem] leading-8 text-slate-400 sm:text-base sm:leading-9">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StockInput({
  value,
  label,
  color,
  onSelect,
}: Readonly<{
  value: StockSel;
  label: string;
  color: string;
  onSelect: (stock: StockSel) => void;
}>) {
  const [query, setQuery] = useState(value.symbol);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value.symbol);
  }, [value.symbol]);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleChange = (nextQuery: string) => {
    setQuery(nextQuery);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (nextQuery.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const data = await stockService.search(nextQuery);
        setResults(data.slice(0, 6));
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 280);
  };

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <div
        className="flex items-center gap-3 rounded-[22px] px-4 py-3 transition"
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${open ? `${color}55` : 'rgba(148, 163, 184, 0.14)'}`,
        }}
      >
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ background: `${color}18`, color }}>
          {label}
        </span>
        <input
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Hisse ara"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
        />
        <Search className="h-4 w-4 shrink-0 text-slate-500" />
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-[22px] border border-white/10 bg-[#0b141b] shadow-2xl"
          >
            {results.map((result, index) => (
              <button
                key={result.symbol}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect({ symbol: result.symbol, name: result.name });
                  setQuery(result.symbol);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/[0.05] ${
                  index < results.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-white">{result.symbol}</p>
                  <p className="truncate text-xs text-slate-500">{result.name}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-500">
                  {result.exchange}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveCompareSection() {
  const [stockA, setStockA] = useState<StockSel>({ symbol: 'THYAO', name: 'Türk Hava Yolları' });
  const [stockB, setStockB] = useState<StockSel>({ symbol: 'GARAN', name: 'Garanti BBVA' });
  const [range, setRange] = useState<'1M' | '3M' | '6M' | '1Y'>('1Y');
  const [chartData, setChartData] = useState<CmpPoint[]>([]);
  const [retA, setRetA] = useState<number | null>(null);
  const [retB, setRetB] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const compare = useCallback(
    async (nextStockA = stockA, nextStockB = stockB, nextRange = range) => {
      setLoading(true);
      setError(null);

      try {
        const fromDate = getRangeFrom(RANGE_MONTHS[nextRange]);
        const toDate = new Date().toISOString().slice(0, 10);
        const [historyA, historyB] = await Promise.all([
          stockService.getHistory(nextStockA.symbol, fromDate, toDate, '1d'),
          stockService.getHistory(nextStockB.symbol, fromDate, toDate, '1d'),
        ]);

        const points = buildNormalizedChartData(
          toClosePoints(historyA.data),
          toClosePoints(historyB.data),
        );

        if (!points.length) {
          throw new Error('empty');
        }

        setChartData(points);
        if (points.length > 0) {
          setRetA(points[points.length - 1].A - 100);
          setRetB(points[points.length - 1].B - 100);
        }
      } catch {
        setError('Veriler şu anda alınamadı. Sembol veya tarih aralığını değiştirip tekrar dene.');
      } finally {
        setLoading(false);
      }
    },
    [range, stockA, stockB]
  );

  useEffect(() => {
    compare();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const summaryCards = [
    { stock: stockA, ret: retA, color: CMP_COLORS.A },
    { stock: stockB, ret: retB, color: CMP_COLORS.B },
  ];
  const selectedPeriod =
    chartData.length > 1 ? `${chartData[0].label} → ${chartData[chartData.length - 1].label}` : 'Seçili Aralık';

  return (
    <section ref={ref} id="compare" className="relative overflow-hidden py-10 sm:py-12 lg:py-14">
      <SectionAtmosphere stars />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Canlı Karşılaştırma"
          title={
            <>
              Karşılaştır
              <span className="block text-gradient">Kararını Netleştir</span>
            </>
          }
          description="Sembol gir, aralığı seç ve sonucu aynı kart içinde anında gör."
        />

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="relative overflow-visible rounded-[32px]"
          style={{
            ...PANEL_STYLE,
            background:
              'radial-gradient(circle at top, rgba(34, 197, 94, 0.08), transparent 34%), linear-gradient(180deg, rgba(8, 15, 21, 0.92) 0%, rgba(8, 15, 21, 0.84) 100%)',
          }}
        >
          <motion.div
            className="pointer-events-none absolute inset-x-24 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
            animate={{ opacity: [0.1, 0.34, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="grid gap-3 border-b border-white/10 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] xl:items-center">
            <StockInput value={stockA} label="A" color={CMP_COLORS.A} onSelect={(stock) => setStockA(stock)} />
            <StockInput value={stockB} label="B" color={CMP_COLORS.B} onSelect={(stock) => setStockB(stock)} />
            <div className="flex items-center justify-between gap-2 rounded-[22px] border border-white/10 bg-white/[0.03] p-1">
              {(['1M', '3M', '6M', '1Y'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setRange(item)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    range === item ? 'bg-primary text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <button
              onClick={() => compare()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-primary px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-primary/90 disabled:opacity-70"
            >
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <BarChart2 className="h-4 w-4" />}
              {loading ? 'Hesaplanıyor' : 'Karşılaştır'}
            </button>
          </div>

          <div className="grid gap-0 xl:grid-cols-[minmax(0,1.22fr)_320px]">
            <div className="p-4 sm:p-6">
              <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,20,28,0.96),rgba(9,15,21,0.82))] p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: CMP_COLORS.A }} />
                      <span className="font-mono text-sm font-semibold text-white">{stockA.symbol}</span>
                      <span className="text-sm text-slate-400">{stockA.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: CMP_COLORS.B }} />
                      <span className="font-mono text-sm font-semibold text-white">{stockB.symbol}</span>
                      <span className="text-sm text-slate-400">{stockB.name}</span>
                    </div>
                  </div>
                  <div className="w-fit rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-sm text-slate-300">
                    {selectedPeriod}
                  </div>
                </div>

              {error && (
                  <div className="flex h-[17rem] flex-col items-center justify-center gap-4 rounded-[24px] border border-white/[0.08] bg-white/[0.02] text-center sm:h-[22rem]">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <BarChart2 className="h-5 w-5" />
                    </div>
                    <p className="max-w-sm text-sm leading-7 text-slate-400">{error}</p>
                    <Link
                      to="/register"
                      className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/15"
                    >
                      Ücretsiz Kayıt Ol
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}

                {!error && chartData.length === 0 && (
                  <div className="flex h-[17rem] items-center justify-center rounded-[24px] border border-white/[0.08] bg-white/[0.02] text-sm text-slate-500 sm:h-[22rem]">
                    Hisse seç ve karşılaştır butonuna bas.
                  </div>
                )}

                {!error && chartData.length > 0 && (
                  <>
                    <motion.div
                      key={`${stockA.symbol}-${stockB.symbol}-${range}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: loading ? 0.3 : 1 }}
                      transition={{ duration: 0.25 }}
                      className="h-[17rem] sm:h-[21rem] lg:h-[24rem]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <ReLineChart data={chartData} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
                          <CartesianGrid vertical={false} stroke="rgba(148, 163, 184, 0.07)" />
                          <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickMargin={10}
                            minTickGap={28}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            width={38}
                            tickCount={4}
                            tickFormatter={(value) => `${Math.round(value)}%`}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                          />
                          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(148, 163, 184, 0.18)' }} />
                          <Line type="monotone" dataKey="A" name={stockA.symbol} stroke={CMP_COLORS.A} strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="B" name={stockB.symbol} stroke={CMP_COLORS.B} strokeWidth={2.5} dot={false} />
                        </ReLineChart>
                      </ResponsiveContainer>
                    </motion.div>

                    <div className="mt-4 rounded-[20px] border border-white/[0.08] bg-black/10 px-4 py-3.5 text-sm text-slate-400">
                      Başlangıç 100 bazında normalize edilir. Seçili aralık boyunca farkı tek grafikte net biçimde görürsün.
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-white/10 bg-black/10 p-4 sm:p-6 xl:border-l xl:border-t-0">
              <div className="space-y-4">
                {summaryCards.map(({ stock, ret, color }) => (
                  <div key={stock.symbol} className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-semibold" style={{ color }}>
                          {stock.symbol}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">{stock.name}</p>
                      </div>
                      <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: `${color}18`, color }}>
                        Seçili Aralık
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">{selectedPeriod}</p>
                    <p className="mt-5 font-mono text-3xl font-semibold text-white">
                      {ret === null ? '--' : `${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%`}
                    </p>
                  </div>
                ))}

                <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-4 text-base leading-8 text-slate-400 sm:p-5">
                  Bu alan doğrudan kayıt akışına bağlanır. Kullanıcı senaryodan kopmaz.
                </div>

                <Link
                  to="/register"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-primary px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-primary/90"
                >
                  Hesap Aç Ve Devam Et
                  <Sparkles className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="relative overflow-hidden pt-1 pb-8 sm:pt-2 sm:pb-9 lg:pt-3 lg:pb-10">
      <SectionAtmosphere stars />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-3 h-px max-w-6xl bg-gradient-to-r from-transparent via-white/10 to-transparent sm:mb-4" />
        <div
          className="relative overflow-hidden rounded-[34px] px-6 py-10 text-center sm:px-10 sm:py-14"
          style={{
            background:
              'radial-gradient(circle at top, rgba(34, 197, 94, 0.12), transparent 35%), linear-gradient(180deg, rgba(8, 15, 21, 0.92) 0%, rgba(8, 15, 21, 0.84) 100%)',
            border: '1px solid rgba(148, 163, 184, 0.14)',
            boxShadow: '0 30px 90px rgba(2, 12, 17, 0.42)',
          }}
        >
          <motion.div
            className="pointer-events-none absolute inset-x-16 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
            animate={{ opacity: [0.18, 0.82, 0.18] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="mx-auto mb-6 flex w-fit justify-center">
            <BrandLogo size="lg" showText={false} markClassName="bg-white/[0.08]" />
          </div>
          <p className="label-brand text-xs font-semibold uppercase tracking-[0.24em]">Son Söz</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl md:leading-[1.04]">
            Geçmişi Değiştiremezsin
            <span className="block text-gradient">Ama Hesaplayabilirsin</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
            "Keşke Alsaydım?" dediğin anı aç, sonucu gör ve bir sonraki hamleni belirle.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-primary px-7 py-4 text-base font-semibold text-slate-950 transition hover:bg-primary/90"
            >
              Ücretsiz Başla
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.04] px-7 py-4 text-base font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative pb-8 pt-2">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 border-t border-white/8 pt-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-lg">
          <Link to="/" className="inline-flex">
            <BrandLogo />
          </Link>
          <p className="mt-4 text-base leading-8 text-slate-500">
            Geçmiş yatırım kararlarını, aklındakilerini ve hayallerini sade, net ve güçlü bir görsel akışla incele.
          </p>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-slate-400">
            <a href="#demo" className="transition hover:text-white">Demo</a>
            <a href="#features" className="transition hover:text-white">Özellikler</a>
            <a href="#compare" className="transition hover:text-white">Karşılaştır</a>
            <Link to="/register" className="transition hover:text-white">Kayıt ol</Link>
            <Link to="/login" className="transition hover:text-white">Giriş yap</Link>
          </div>
        </div>

        <div className="mt-8 border-t border-white/6 pt-6 text-xs text-slate-600">
          © 2026 Keşke Alsaydım. Veriler bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const [navSolid, setNavSolid] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (value) => {
    setNavSolid(value > 28);
  });

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#071116] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'radial-gradient(circle at top, black 20%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(circle at top, black 20%, transparent 70%)',
          }}
        />
        <div
          className="absolute left-1/2 top-0 h-[420px] w-[72vw] -translate-x-1/2 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(34, 197, 94, 0.14) 0%, transparent 70%)' }}
        />
        <div
          className="absolute right-0 top-[18%] h-[420px] w-[420px] blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(56, 189, 248, 0.10) 0%, transparent 72%)' }}
        />
      </div>

      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-30 border-b transition"
        style={{
          background: navSolid ? 'rgba(7, 17, 22, 0.82)' : 'rgba(7, 17, 22, 0.42)',
          backdropFilter: 'blur(18px)',
          borderColor: navSolid ? 'rgba(148, 163, 184, 0.10)' : 'transparent',
        }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[68px] items-center justify-between gap-4">
            <Link to="/" aria-label="Keşke Alsaydım ana sayfa">
              <BrandLogo />
            </Link>

            <div className="hidden items-center gap-7 md:flex">
              {NAV_ITEMS.map((item) => (
                <a key={item.href} href={item.href} className="text-sm text-slate-400 transition hover:text-white">
                  {item.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                className="rounded-full px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
              >
                Giriş
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-primary/90"
              >
                Başla
                <Sparkles className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 md:hidden no-scrollbar">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </motion.nav>

      <main className="relative z-10">
        <HeroSection />
        <SectionDivider />
        <DemoSection />
        <SectionDivider />
        <FeaturesSection />
        <SectionDivider />
        <HowItWorksSection />
        <SectionDivider />
        <LiveCompareSection />
        <SectionDivider />
        <CtaSection />
      </main>

      <Footer />
    </div>
  );
}

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
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
} from "lucide-react";
import CountUp from "react-countup";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BrandLogo } from "@/components/BrandLogo";
import { COMPARISON_DATA, SCENARIOS } from "@/lib/landingData";
import { stockService } from "@/services/stockService";

const NAV_ITEMS = [
  { label: "Demo", href: "#demo" },
  { label: "Özellikler", href: "#features" },
  { label: "Nasıl Çalışır", href: "#how" },
  { label: "Karşılaştır", href: "#compare" },
];

const FEATURES = [
  {
    icon: GitCompare,
    title: "Canlı Karşılaştırma",
    desc: "İki hisseyi aynı anda aç. Sonucu tek grafikte net biçimde gör.",
  },
  {
    icon: LineChart,
    title: "Tarihsel Senaryo",
    desc: "İstediğin tarihe dön. Bugünkü değeri sade bir özetle yakala.",
  },
  {
    icon: Shield,
    title: "Temiz Deneyim",
    desc: "Gereksiz katman yok. Veriye odaklanan sakin ve güvenli bir akış var.",
  },
  {
    icon: Zap,
    title: "Mobilde Güçlü",
    desc: "Tüm düzen mobilde de aynı netlikle akar. Kartlar temizce istiflenir.",
  },
];

type HeroRange = "1G" | "1H" | "1A" | "3A" | "1Y" | "5Y";

function dateFrom(op: (d: Date) => void): string {
  const d = new Date();
  op(d);
  return d.toISOString().slice(0, 10);
}

const RANGE_CONFIG: Record<HeroRange, { getFrom: () => string; interval: string; fallback: number }> = {
  // 5 gün geriden saatlik çek, sonra sadece son işlem gününü filtrele
  "1G": { getFrom: () => dateFrom((d) => d.setDate(d.getDate() - 5)),    interval: "1h",  fallback: 2  },
  // Tam 7 takvim günü geri
  "1H": { getFrom: () => dateFrom((d) => d.setDate(d.getDate() - 7)),    interval: "1d",  fallback: 2  },
  // Tam 30 takvim günü geri
  "1A": { getFrom: () => dateFrom((d) => d.setDate(d.getDate() - 30)),   interval: "1d",  fallback: 3  },
  // 3 ay geri (Mar → Ara, Oca → Eki gibi)
  "3A": { getFrom: () => dateFrom((d) => d.setMonth(d.getMonth() - 3)),  interval: "1d",  fallback: 6  },
  // 1 yıl geri (2026 → 2025)
  "1Y": { getFrom: () => dateFrom((d) => d.setFullYear(d.getFullYear() - 1)), interval: "1d", fallback: 15 },
  // 5 yıl geri (2026 → 2021)
  "5Y": { getFrom: () => dateFrom((d) => d.setFullYear(d.getFullYear() - 5)), interval: "1wk", fallback: 37 },
};

const TR_MONTHS = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];
const TR_DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const CMP_COLORS = { A: "#22c55e", B: "#38bdf8" };
const PANEL_STYLE = {
  background: "rgba(8, 15, 21, 0.82)",
  border: "1px solid rgba(148, 163, 184, 0.10)",
  boxShadow: "0 22px 72px rgba(2, 12, 17, 0.34)",
};
const PANEL_INNER_STYLE = {
  background: "rgba(255, 255, 255, 0.025)",
  border: "1px solid rgba(148, 163, 184, 0.10)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.016)",
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

function toClosePoints(
  data: { date: string; close: number; adjustedClose: number }[]
): ClosePoint[] {
  return data.map((point) => ({
    date: point.date,
    close: point.adjustedClose || point.close,
  }));
}

function fmtLabel(date: string, range: HeroRange): string {
  const dt = new Date(date);
  if (range === "1G") {
    return `${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`;
  }
  if (range === "1H") {
    return `${TR_DAYS[dt.getDay()]} ${dt.getDate()}`;
  }
  if (range === "1A") {
    return `${dt.getDate()} ${TR_MONTHS[dt.getMonth()]}`;
  }
  return `${TR_MONTHS[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}`;
}

function buildNormalizedChartData(
  historyA: ClosePoint[],
  historyB: ClosePoint[],
  range: HeroRange
): CmpPoint[] {
  if (!historyA.length || !historyB.length) return [];

  const baseA = historyA[0].close;
  const baseB = historyB[0].close;
  const mapB = new Map(historyB.map((p) => [p.date, p.close]));

  const normalized = historyA.flatMap((pointA) => {
    const closeB = mapB.get(pointA.date);
    if (closeB === undefined) return [];
    return [{
      label: fmtLabel(pointA.date, range),
      A: Number.parseFloat(((pointA.close / baseA) * 100).toFixed(2)),
      B: Number.parseFloat(((closeB / baseB) * 100).toFixed(2)),
    }];
  });

  const maxTicks = range === "1G" || range === "1H" ? normalized.length : 10;
  return normalized.filter(
    (_, i) =>
      i === 0 ||
      i === normalized.length - 1 ||
      i % Math.max(1, Math.floor(normalized.length / maxTicks)) === 0
  );
}


function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className="rounded-2xl border border-white/10 bg-[#0b141b]/95 px-4 py-3 text-xs shadow-2xl"
      style={{ boxShadow: "0 20px 40px rgba(2, 12, 17, 0.45)" }}
    >
      <p className="mb-2 text-slate-400">{label}</p>
      {payload.map((item: any) => (
        <p
          key={item.dataKey}
          className="font-semibold"
          style={{ color: item.stroke || "#22c55e" }}
        >
          {item.name === "v"
            ? `₺${Number(item.value).toLocaleString("tr-TR")}`
            : (() => {
                const delta = (Number(item.value) - 100).toFixed(1);
                return `${item.name}: ${Number(delta) >= 0 ? "+" : ""}${delta}%`;
              })()}
        </p>
      ))}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  aside,
}: Readonly<{
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  align?: "center" | "left";
  aside?: ReactNode;
}>) {
  const baseClass =
    aside != null
      ? "mb-5 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between"
      : align === "left"
      ? "mb-5 max-w-2xl lg:mb-8"
      : "mb-7 mx-auto max-w-4xl text-center lg:mb-10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className={baseClass}
    >
      <div className={align === "left" ? "max-w-2xl" : undefined}>
        <span className="label-brand mb-4 block text-[11px] font-semibold uppercase tracking-[0.24em] sm:mb-6 sm:text-xs">
          {eyebrow}
        </span>
        <h2 className="max-w-4xl text-[2.1rem] font-semibold tracking-tight text-white leading-[1.04] sm:text-4xl md:text-5xl md:leading-[1.02]">
          {title}
        </h2>
        {align === "center" && aside == null ? (
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:mt-7 sm:flex-row sm:gap-5">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary/80 to-primary/20 sm:w-16" />
            <p className="max-w-3xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
              {description}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 h-px w-20 bg-gradient-to-r from-primary via-secondary to-transparent sm:mt-6 sm:w-24" />
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:mt-6 sm:text-base sm:leading-7">
              {description}
            </p>
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
        style={{
          background:
            "radial-gradient(circle at top, rgba(34, 197, 94, 0.16) 0%, transparent 72%)",
        }}
      />
      <div
        className="absolute inset-x-[24%] top-16 h-36 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at top, rgba(56, 189, 248, 0.12) 0%, transparent 74%)",
        }}
      />
      {stars && (
        <>
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.75) 1px, transparent 1.5px), radial-gradient(circle, rgba(34,197,94,0.5) 1px, transparent 1.8px)",
              backgroundPosition: "0 0, 28px 18px",
              backgroundSize: "110px 110px, 170px 170px",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 25%, rgba(34, 197, 94, 0.18) 0%, transparent 22%), radial-gradient(circle at 78% 18%, rgba(56, 189, 248, 0.14) 0%, transparent 20%), radial-gradient(circle at 50% 70%, rgba(255, 255, 255, 0.08) 0%, transparent 24%)",
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
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55 }}
        className="mx-auto h-px max-w-5xl origin-center bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-px w-28 -translate-y-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent"
        animate={{ x: ["-220%", "220%"], opacity: [0, 0.85, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(34, 197, 94, 0.16) 0%, transparent 72%)",
        }}
      />
    </div>
  );
}

function NvidiaMark() {
  return (
    <PartnerLogoBadge
      src="/brands/nvidia-logo.svg"
      alt="NVIDIA logo"
      imageClassName="max-h-[18px] w-full max-w-[52px]"
    />
  );
}

function AppleMark() {
  return (
    <PartnerLogoBadge
      src="/brands/apple-logo-black.svg"
      alt="Apple logo"
      imageClassName="h-6 w-6"
    />
  );
}

function PartnerLogoBadge({
  src,
  alt,
  imageClassName,
}: Readonly<{
  src: string;
  alt: string;
  imageClassName: string;
}>) {
  return (
    <span className="inline-flex h-10 w-[84px] items-center justify-center rounded-2xl bg-white/95 px-3 shadow-[0_12px_30px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/8">
      <img src={src} alt={alt} className={`block object-contain ${imageClassName}`} />
    </span>
  );
}

function HeroSection() {
  const [stockA, setStockA] = useState<StockSel>({ symbol: "NVDA", name: "NVIDIA" });
  const [stockB, setStockB] = useState<StockSel>({ symbol: "AAPL", name: "Apple" });
  const [range, setRange] = useState<HeroRange>("5Y");
  const [chartData, setChartData] = useState<CmpPoint[]>([]);
  const [retA, setRetA] = useState<number | null>(null);
  const [retB, setRetB] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const firstRenderDone = useRef(false);
  const prevRange = useRef(range);

  const runCompare = useCallback(
    async (sA: StockSel, sB: StockSel, r: HeroRange) => {
      setLoading(true);
      setFetchError(false);
      try {
        const { getFrom, interval } = RANGE_CONFIG[r];
        const fromDate = getFrom();
        const toDate = new Date().toISOString().slice(0, 10);
        const [histA, histB] = await Promise.all([
          stockService.getHistory(sA.symbol, fromDate, toDate, interval),
          stockService.getHistory(sB.symbol, fromDate, toDate, interval),
        ]);
        let ptsA = toClosePoints(histA.data);
        let ptsB = toClosePoints(histB.data);
        if (r === "1G" && ptsA.length > 0) {
          const lastDay = ptsA[ptsA.length - 1].date.slice(0, 10);
          ptsA = ptsA.filter((p) => p.date.startsWith(lastDay));
          ptsB = ptsB.filter((p) => p.date.startsWith(lastDay));
        }
        const pts = buildNormalizedChartData(ptsA, ptsB, r);
        if (!pts.length) throw new Error("empty");
        setChartData(pts);
        setRetA(pts[pts.length - 1].A - 100);
        setRetB(pts[pts.length - 1].B - 100);
      } catch {
        setFetchError(true);
        setChartData([]);
        setRetA(null);
        setRetB(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const rangeChanged = prevRange.current !== range;
    prevRange.current = range;
    if (!firstRenderDone.current) {
      firstRenderDone.current = true;
      runCompare(stockA, stockB, range);
      return;
    }
    if (rangeChanged) {
      runCompare(stockA, stockB, range);
      return;
    }
    const t = setTimeout(() => runCompare(stockA, stockB, range), 500);
    return () => clearTimeout(t);
  }, [stockA.symbol, stockB.symbol, range]); // eslint-disable-line

  const gap = retA !== null && retB !== null ? retA - retB : null;

  const periodLabel = (() => {
    const now = new Date();
    if (range === "1G") {
      return `Bugün · ${now.getDate()} ${TR_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    }
    if (chartData.length > 1) {
      return `${chartData[0].label} → ${chartData[chartData.length - 1].label}`;
    }
    return loading ? "Yükleniyor…" : "—";
  })();

  return (
    <section className="relative flex min-h-[calc(100svh-7rem)] items-center md:min-h-[calc(100svh-4.5rem)]">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8 lg:pb-20 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,1.15fr)] lg:items-center lg:gap-14 xl:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="mx-auto max-w-[28rem] text-center sm:max-w-none sm:text-left lg:mx-0"
          >
            <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary shadow-[0_0_24px_rgba(34,197,94,0.08)] sm:mx-0 sm:mb-5 sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(34,197,94,0.7)] sm:h-2 sm:w-2"></span>
              {"\"Keşke Alsaydım?\" Sorusuna Net Cevap"}
            </div>

            <h1 className="mx-auto max-w-[10.5ch] pb-2 text-[2rem] font-semibold leading-[1.01] tracking-tight text-white sm:pb-3 sm:text-[3.2rem] sm:leading-[0.99] lg:mx-0 lg:text-[3.8rem] xl:text-[4.5rem]">
              Ya O Hisseyi
              <span className="block pb-[0.06em] text-gradient">
                Gerçekten Alsaydın?
              </span>
            </h1>

            <p className="mx-auto mt-3 max-w-[26rem] text-[0.9rem] leading-6 text-slate-400 sm:mt-5 sm:max-w-lg sm:text-[1.04rem] sm:leading-8 lg:mx-0">
              Bir tarih veya zaman aralığı seç, o gün yatırım yapsaydın bugün neler olacağını gör.
            </p>
            <p className="mx-auto mt-1 max-w-[26rem] text-[0.9rem] leading-6 text-slate-300 sm:mt-2 sm:max-w-lg sm:text-[1.04rem] sm:leading-8 lg:mx-0">
              İki hisseyi yan yana karşılaştır.
            </p>

            <div className="mt-5 flex flex-row justify-center gap-2.5 sm:mt-7 sm:justify-start">
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-primary/90 sm:gap-2 sm:px-6 sm:py-3 sm:text-[0.98rem]"
              >
                Ücretsiz Dene
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] sm:gap-2 sm:px-6 sm:py-3 sm:text-[0.98rem]"
              >
                Demoyu Gör
                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="relative mt-1 lg:mt-0 lg:w-full lg:justify-self-end"
          >
            {/* Ambient glow orbs */}
            <motion.div
              className="pointer-events-none absolute -right-8 -top-6 h-28 w-28 rounded-full blur-3xl"
              animate={{ opacity: [0.12, 0.24, 0.12], scale: [0.92, 1.05, 0.95] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ background: "radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, transparent 72%)" }}
            />
            <motion.div
              className="pointer-events-none absolute -left-8 bottom-10 h-24 w-24 rounded-full blur-3xl"
              animate={{ opacity: [0.08, 0.18, 0.08], scale: [0.96, 1.08, 0.97] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.13) 0%, transparent 72%)" }}
            />

            <div
              className="relative overflow-hidden rounded-[26px] p-3.5 sm:rounded-[28px] sm:p-5 xl:p-6"
              style={{
                ...PANEL_STYLE,
                background: "linear-gradient(180deg, rgba(10, 18, 25, 0.96) 0%, rgba(8, 15, 21, 0.82) 100%)",
              }}
            >
              {/* Header: label + inputs + range */}
              <div className="border-b border-white/8 pb-3.5 sm:pb-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="label-brand text-[11px] font-semibold uppercase tracking-[0.24em]">
                    Canlı Karşılaştırma
                  </p>
                  {loading && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <StockInput value={stockA} label="A" color={CMP_COLORS.A} onSelect={setStockA} />
                    <StockInput value={stockB} label="B" color={CMP_COLORS.B} onSelect={setStockB} />
                  </div>
                  <div className="flex items-center gap-1 self-end rounded-[18px] border border-white/10 bg-white/[0.03] p-1">
                    {(["1G", "1H", "1A", "3A", "1Y", "5Y"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          range === r ? "bg-primary text-slate-950" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart inner panel */}
              <div className="relative mt-3.5 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,24,34,0.9),rgba(9,15,21,0.76))] p-3.5 sm:mt-4 sm:rounded-[26px] sm:p-5 xl:p-6">
                <motion.div
                  className="pointer-events-none absolute left-10 right-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
                  animate={{ opacity: [0.14, 0.4, 0.14] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Legend */}
                <div className="mb-3.5 flex flex-col gap-2.5 border-b border-white/8 pb-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-4">
                    {[
                      { stock: stockA, color: CMP_COLORS.A },
                      { stock: stockB, color: CMP_COLORS.B },
                    ].map(({ stock, color }) => (
                      <div key={stock.symbol} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                        <span className="font-mono font-semibold" style={{ color }}>{stock.symbol}</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-300">{stock.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 sm:whitespace-nowrap">
                    {periodLabel}
                  </div>
                </div>

                {/* Chart */}
                <div className="h-[14rem] sm:h-[18rem] lg:h-[20rem] xl:h-[23rem]">
                  {fetchError ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                      <p className="text-sm text-slate-400">Veri yüklenemedi</p>
                      <button
                        onClick={() => runCompare(stockA, stockB, range)}
                        className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.1]"
                      >
                        Tekrar Dene
                      </button>
                    </div>
                  ) : (
                    <motion.div
                      key={`hero-${stockA.symbol}-${stockB.symbol}-${range}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: loading ? 0.35 : 1 }}
                      transition={{ duration: 0.25 }}
                      className="h-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <ReLineChart data={chartData} margin={{ top: 6, right: 12, bottom: 0, left: 4 }}>
                          <CartesianGrid vertical={false} stroke="rgba(148, 163, 184, 0.07)" />
                          <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            minTickGap={24}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            width={44}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            domain={[
                              (min: number) => Math.min(Math.floor(min) - 2, 98),
                              (max: number) => Math.ceil(max) + 2,
                            ]}
                            tickFormatter={(v: number) => {
                              const d = Math.round(v - 100);
                              return `${d >= 0 ? "+" : ""}${d}%`;
                            }}
                          />
                          <ReferenceLine y={100} stroke="rgba(148,163,184,0.18)" strokeDasharray="4 3" />
                          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(148, 163, 184, 0.18)" }} />
                          <Line type="monotone" dataKey="A" name={stockA.symbol} stroke={CMP_COLORS.A} strokeWidth={2.8} dot={false} />
                          <Line type="monotone" dataKey="B" name={stockB.symbol} stroke={CMP_COLORS.B} strokeWidth={2.8} dot={false} />
                        </ReLineChart>
                      </ResponsiveContainer>
                    </motion.div>
                  )}
                </div>

                {/* Stats row */}
                <div className="mt-3.5 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-3 xl:gap-4">
                  {[
                    { label: stockA.symbol, value: retA !== null ? `${retA >= 0 ? "+" : ""}${retA.toFixed(1)}%` : "--", color: CMP_COLORS.A },
                    { label: stockB.symbol, value: retB !== null ? `${retB >= 0 ? "+" : ""}${retB.toFixed(1)}%` : "--", color: CMP_COLORS.B },
                    { label: "Fark", value: gap !== null ? `${gap >= 0 ? "+" : ""}${gap.toFixed(1)}%` : "--", color: "#f59e0b" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[17px] border border-white/10 bg-black/10 px-2.5 py-3 sm:px-3.5 sm:py-3.5 xl:px-4 xl:py-4">
                      <p className="text-[10px] uppercase tracking-[0.22em] sm:text-[11px]" style={{ color: item.color }}>{item.label}</p>
                      <p className="mt-1.5 font-mono text-[0.95rem] font-semibold sm:mt-2 xl:text-base" style={{ color: item.color }}>{item.value}</p>
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
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const scenario = SCENARIOS[active];
  const profit = scenario.finalValue - scenario.investment;

  const handleSelect = (index: number) => {
    setActive(index);
    setAnimKey((current) => current + 1);
  };

  return (
    <section
      ref={ref}
      id="demo"
      className="relative overflow-hidden py-8 sm:py-12 lg:py-14"
    >
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

        <div className="mb-4 flex justify-start gap-2 overflow-x-auto pb-1 no-scrollbar sm:mb-6 sm:justify-center">
          {SCENARIOS.map((item, index) => (
            <button
              key={item.symbol}
              onClick={() => handleSelect(index)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition sm:px-5 ${
                active === index
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
              }`}
            >
              <span className="font-mono font-semibold">{item.symbol}</span>
              <span className="ml-2 hidden text-xs sm:inline">
                {item.buyDate}
              </span>
            </button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="relative overflow-hidden rounded-[28px] sm:rounded-[32px]"
          style={{
            ...PANEL_STYLE,
            background:
              "radial-gradient(circle at top, rgba(34, 197, 94, 0.08), transparent 36%), linear-gradient(180deg, rgba(8, 15, 21, 0.92) 0%, rgba(8, 15, 21, 0.82) 100%)",
          }}
        >
          <div className="pointer-events-none absolute inset-x-24 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_352px]">
            <div className="p-3.5 sm:p-6 lg:p-7">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 lg:mb-6 lg:gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[1.25rem] font-semibold text-white sm:text-[1.9rem]">
                      {scenario.name}
                    </p>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400">
                      {scenario.exchange}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{
                        background: `${scenario.accentColor}20`,
                        color: scenario.accentColor,
                      }}
                    >
                      {scenario.tagline}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] text-slate-500 sm:text-sm">
                    {scenario.buyDate} - Aralık 2025 arası tarihsel veri
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-right sm:rounded-[24px]">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Getiri
                  </p>
                  <p
                    className="mt-1 font-mono text-lg font-semibold"
                    style={{ color: scenario.accentColor }}
                  >
                    +{scenario.returnPct}%
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,20,28,0.96),rgba(9,15,21,0.82))] p-3.5 sm:rounded-[28px] sm:p-5">
                <motion.div
                  className="pointer-events-none absolute left-10 right-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
                  animate={{ opacity: [0.12, 0.34, 0.12] }}
                  transition={{
                    duration: 3.1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <div className="h-[13.5rem] sm:h-[19rem] lg:h-[21rem]">
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
                        <AreaChart
                          data={scenario.data}
                          margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id={`demo-${scenario.symbol}`}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor={scenario.accentColor}
                                stopOpacity={0.28}
                              />
                              <stop
                                offset="95%"
                                stopColor={scenario.accentColor}
                                stopOpacity={0.02}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            vertical={false}
                            stroke="rgba(148, 163, 184, 0.07)"
                          />
                          <XAxis
                            dataKey="t"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickMargin={10}
                            minTickGap={26}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            width={40}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickCount={4}
                            tickFormatter={(value) =>
                              `₺${Math.round(value / 1000)}K`
                            }
                          />
                          <Tooltip
                            content={<ChartTooltip />}
                            cursor={{ stroke: "rgba(148, 163, 184, 0.18)" }}
                          />
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

                <div className="mt-3.5 rounded-[20px] border border-white/[0.08] bg-black/10 px-3.5 py-3 sm:mt-4 sm:rounded-[22px] sm:px-4 sm:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[11px] font-semibold text-slate-950"
                        style={{ background: scenario.accentColor }}
                      >
                        {scenario.symbol.slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white sm:text-base">
                          {scenario.symbol}
                          <span className="ml-2 font-normal text-slate-400">
                            {scenario.buyDate}
                          </span>
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-xs text-slate-400 sm:text-sm">
                      Tek bakışta senaryo
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-black/10 p-3.5 sm:p-6 lg:border-l lg:border-t-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${animKey}-summary`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid gap-3 sm:gap-4 min-[560px]:grid-cols-2 lg:grid-cols-2 xl:grid-cols-1"
                >
                  <div className="w-fit rounded-[22px] border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 sm:ml-auto sm:rounded-[24px] sm:px-5 sm:py-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Getiri
                    </p>
                    <p
                      className="mt-2 font-mono text-2xl font-semibold"
                      style={{ color: scenario.accentColor }}
                    >
                      +{scenario.returnPct}%
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-4 sm:rounded-[24px] sm:p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Yatırım
                    </p>
                    <p className="mt-3 font-mono text-2xl font-semibold text-white">
                      ₺10.000
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-4 sm:rounded-[24px] sm:p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Bugünkü değer
                    </p>
                    <p className="mt-3 font-mono text-3xl font-semibold text-white">
                      <CountUp
                        end={scenario.finalValue}
                        separator="."
                        prefix="₺"
                        duration={0.7}
                      />
                    </p>
                  </div>

                  <div
                    className="rounded-[22px] p-4 sm:rounded-[24px] sm:p-5"
                    style={{
                      background: scenario.isProfit
                        ? "rgba(34, 197, 94, 0.10)"
                        : "rgba(248, 113, 113, 0.10)",
                      border: `1px solid ${
                        scenario.isProfit
                          ? "rgba(34, 197, 94, 0.18)"
                          : "rgba(248, 113, 113, 0.18)"
                      }`,
                    }}
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Toplam fark
                    </p>
                    <p
                      className="mt-3 font-mono text-3xl font-semibold"
                      style={{
                        color: scenario.isProfit ? "#22c55e" : "#f87171",
                      }}
                    >
                      {scenario.isProfit ? "+" : "-"}₺
                      <CountUp
                        end={Math.abs(profit)}
                        separator="."
                        duration={0.7}
                      />
                    </p>
                    <p
                      className="mt-2 text-sm font-semibold"
                      style={{
                        color: scenario.isProfit ? "#22c55e" : "#f87171",
                      }}
                    >
                      {scenario.isProfit ? "+" : ""}
                      <CountUp
                        end={scenario.returnPct}
                        suffix="%"
                        duration={0.7}
                      />{" "}
                      getiri
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-4 text-sm leading-7 text-slate-400 min-[560px]:col-span-2 sm:rounded-[24px] sm:p-5 xl:col-span-1">
                    Tek bakışta sonucu gör. Akış kısa, mesaj nettir.
                  </div>

                  <Link
                    to="/register"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-primary px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-primary/90 min-[560px]:col-span-2 xl:col-span-1"
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
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      id="features"
      className="relative overflow-hidden py-8 sm:py-12 lg:py-14"
    >
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

        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="group relative overflow-hidden rounded-[24px] p-4 transition hover:-translate-y-1 sm:rounded-[28px] sm:p-7"
                style={{
                  ...PANEL_INNER_STYLE,
                  background:
                    "linear-gradient(180deg, rgba(8, 15, 21, 0.86) 0%, rgba(8, 15, 21, 0.72) 100%)",
                }}
              >
                <motion.div
                  className="pointer-events-none absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
                  animate={{ opacity: [0.1, 0.32, 0.1] }}
                  transition={{
                    duration: 3 + index * 0.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <div
                  className="pointer-events-none absolute bottom-0 left-1/2 h-12 w-28 -translate-x-1/2 blur-2xl"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(34, 197, 94, 0.13) 0%, transparent 72%)",
                  }}
                />
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 sm:mb-6 sm:h-12 sm:w-12">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-[1.22rem] font-semibold tracking-tight text-white sm:text-[1.7rem]">
                  {item.title}
                </h3>
                <p className="mt-3 max-w-[18rem] text-[0.94rem] leading-7 text-slate-400 sm:mt-4 sm:text-base sm:leading-9">
                  {item.desc}
                </p>
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
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const steps = [
    {
      id: "01",
      icon: Search,
      title: "Hisseyi Seç",
      desc: "Arama kutusuna sembol ya da isim yaz. Sonuçlar hızlıca gelsin.",
    },
    {
      id: "02",
      icon: Clock3,
      title: "Tarihi Belirle",
      desc: "Geçmişe dön ve hangi günden itibaren bakacağını seç.",
    },
    {
      id: "03",
      icon: BarChart2,
      title: "Sonucu Gör",
      desc: "Getiri, grafik ve özet kartı aynı blokta dursun.",
    },
  ];

  return (
    <section
      ref={ref}
      id="how"
      className="relative overflow-hidden py-8 sm:py-12 lg:py-14"
    >
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

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="group relative overflow-hidden rounded-[24px] p-4 sm:rounded-[30px] sm:p-7"
                style={{
                  ...PANEL_INNER_STYLE,
                  background:
                    "linear-gradient(180deg, rgba(8, 15, 21, 0.88) 0%, rgba(8, 15, 21, 0.72) 100%)",
                }}
              >
                <motion.div
                  className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
                  animate={{ opacity: [0.1, 0.34, 0.1] }}
                  transition={{
                    duration: 2.8 + index * 0.22,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <div
                  className="pointer-events-none absolute bottom-0 left-1/2 h-12 w-32 -translate-x-1/2 blur-2xl"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(34, 197, 94, 0.13) 0%, transparent 72%)",
                  }}
                />
                <div className="mb-5 flex items-center justify-between sm:mb-8">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 sm:h-12 sm:w-12">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[1.2rem] font-semibold text-slate-500 sm:text-2xl">
                    {step.id}
                  </span>
                </div>
                <h3 className="text-[1.35rem] font-semibold tracking-tight text-white sm:text-[2rem]">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[20rem] text-[0.94rem] leading-7 text-slate-400 sm:mt-4 sm:text-base sm:leading-9">
                  {step.desc}
                </p>
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
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
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
          background: "rgba(255, 255, 255, 0.04)",
          border: `1px solid ${
            open ? `${color}55` : "rgba(148, 163, 184, 0.14)"
          }`,
        }}
      >
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{ background: `${color}18`, color }}
        >
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
                  index < results.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-white">
                    {result.symbol}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {result.name}
                  </p>
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
  const [range, setRange] = useState<"6A" | "1Y" | "MAX">("MAX");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const sliceMap = { "6A": 6, "1Y": 12, "MAX": COMPARISON_DATA.length };
  const rangeLabel = range === "6A" ? "6 Ay" : range === "1Y" ? "1 Yıl" : "Tüm Süre";
  const sliced = COMPARISON_DATA.slice(COMPARISON_DATA.length - sliceMap[range]);
  const baseA = sliced[0]?.NVDA ?? 100;
  const baseB = sliced[0]?.AAPL ?? 100;
  const chartData: CmpPoint[] = sliced.map((p) => ({
    label: p.t,
    A: Number.parseFloat(((p.NVDA / baseA) * 100).toFixed(1)),
    B: Number.parseFloat(((p.AAPL / baseB) * 100).toFixed(1)),
  }));

  const last = chartData[chartData.length - 1];
  const retNVDA = last ? last.A - 100 : 0;
  const retAAPL = last ? last.B - 100 : 0;
  const gap = retNVDA - retAAPL;
  const selectedPeriod =
    chartData.length > 1
      ? `${chartData[0].label} → ${chartData[chartData.length - 1].label}`
      : "";

  return (
    <section
      ref={ref}
      id="compare"
      className="relative overflow-hidden py-8 sm:py-12 lg:py-14"
    >
      <SectionAtmosphere stars />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Karşılaştırma Önizlemesi"
          title={
            <>
              İki Hisseyi
              <span className="block text-gradient">Yan Yana Gör</span>
            </>
          }
          description="NVDA ve AAPL'ın tarihsel performansını normalize edilmiş grafikte karşılaştır. Hesabını aç ve istediğin hisselerle dene."
        />

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="relative overflow-hidden rounded-[28px] sm:rounded-[32px]"
          style={{
            ...PANEL_STYLE,
            background:
              "radial-gradient(circle at top, rgba(34, 197, 94, 0.08), transparent 34%), linear-gradient(180deg, rgba(8, 15, 21, 0.92) 0%, rgba(8, 15, 21, 0.84) 100%)",
          }}
        >
          <motion.div
            className="pointer-events-none absolute inset-x-24 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
            animate={{ opacity: [0.1, 0.34, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Header: stock labels + range selector */}
          <div className="flex flex-col gap-3 border-b border-white/10 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <NvidiaMark />
                <span className="font-mono text-sm font-semibold" style={{ color: CMP_COLORS.A }}>
                  NVDA
                </span>
                <span className="text-sm text-slate-400">NVIDIA</span>
              </div>
              <span className="text-sm font-medium text-slate-600">vs</span>
              <div className="flex items-center gap-2">
                <AppleMark />
                <span className="font-mono text-sm font-semibold" style={{ color: CMP_COLORS.B }}>
                  AAPL
                </span>
                <span className="text-sm text-slate-400">Apple</span>
              </div>
            </div>
            <div className="flex items-center gap-1 self-start rounded-[20px] border border-white/10 bg-white/[0.03] p-1 sm:self-auto">
              {(["6A", "1Y", "MAX"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                    range === r
                      ? "bg-primary text-slate-950"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Main grid */}
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1.22fr)_300px]">
            {/* Chart panel */}
            <div className="p-3.5 sm:p-6">
              <div className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,20,28,0.96),rgba(9,15,21,0.82))] p-3.5 sm:rounded-[28px] sm:p-5">
                {/* Legend + period */}
                <div className="mb-3.5 flex flex-col gap-3 border-b border-white/8 pb-3.5 sm:flex-row sm:items-center sm:justify-between sm:pb-4">
                  <div className="flex flex-wrap items-center gap-4">
                    {[
                      { symbol: "NVDA", name: "NVIDIA", color: CMP_COLORS.A },
                      { symbol: "AAPL", name: "Apple", color: CMP_COLORS.B },
                    ].map(({ symbol, name, color }) => (
                      <div key={symbol} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                        <span className="font-mono text-sm font-semibold text-white">{symbol}</span>
                        <span className="text-sm text-slate-400">{name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-fit rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-sm text-slate-300">
                    {selectedPeriod}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={range}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="h-[14rem] sm:h-[21rem] lg:h-[24rem]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <ReLineChart data={chartData} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} stroke="rgba(148, 163, 184, 0.07)" />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          tickMargin={10}
                          minTickGap={28}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          width={40}
                          tickCount={4}
                          tickFormatter={(v) => `${Math.round(v)}%`}
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(148, 163, 184, 0.18)" }} />
                        <Line type="monotone" dataKey="A" name="NVDA" stroke={CMP_COLORS.A} strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="B" name="AAPL" stroke={CMP_COLORS.B} strokeWidth={2.5} dot={false} />
                      </ReLineChart>
                    </ResponsiveContainer>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-3.5 rounded-[18px] border border-white/[0.08] bg-black/10 px-3.5 py-3 text-sm leading-7 text-slate-400 sm:mt-4">
                  Başlangıç 100 bazında normalize edilir. Seçili aralık boyunca
                  farkı tek grafikte net biçimde görürsün.
                </div>
              </div>
            </div>

            {/* Side panel */}
            <div className="border-t border-white/10 bg-black/10 p-3.5 sm:p-6 xl:border-l xl:border-t-0">
              <div className="grid gap-3 sm:gap-4 min-[560px]:grid-cols-2 xl:grid-cols-1">
                {[
                  { symbol: "NVDA", name: "NVIDIA", ret: retNVDA, color: CMP_COLORS.A },
                  { symbol: "AAPL", name: "Apple", ret: retAAPL, color: CMP_COLORS.B },
                ].map(({ symbol, name, ret, color }) => (
                  <div
                    key={symbol}
                    className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-4 sm:rounded-[24px] sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-semibold" style={{ color }}>
                          {symbol}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">{name}</p>
                      </div>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-medium"
                        style={{ background: `${color}18`, color }}
                      >
                        {rangeLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">{selectedPeriod}</p>
                    <p
                      className="mt-4 font-mono text-[1.7rem] font-semibold"
                      style={{ color: ret >= 0 ? "#22c55e" : "#f87171" }}
                    >
                      {`${ret >= 0 ? "+" : ""}${ret.toFixed(1)}%`}
                    </p>
                  </div>
                ))}

                <div
                  className="rounded-[22px] p-4 sm:rounded-[24px] sm:p-5 min-[560px]:col-span-2 xl:col-span-1"
                  style={{
                    background: "rgba(245, 158, 11, 0.06)",
                    border: "1px solid rgba(245, 158, 11, 0.18)",
                  }}
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-amber-400/70">
                    Fark (NVDA − AAPL)
                  </p>
                  <p
                    className="mt-3 font-mono text-2xl font-semibold"
                    style={{ color: gap >= 0 ? "#f59e0b" : "#f87171" }}
                  >
                    {`${gap >= 0 ? "+" : ""}${gap.toFixed(1)}%`}
                  </p>
                </div>

                <Link
                  to="/register"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-primary px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-primary/90 min-[560px]:col-span-2 xl:col-span-1"
                >
                  Hesap Aç Ve Karşılaştır
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
    <section className="relative overflow-hidden pt-1 pb-7 sm:pt-2 sm:pb-9 lg:pt-3 lg:pb-10">
      <SectionAtmosphere stars />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-3 h-px max-w-6xl bg-gradient-to-r from-transparent via-white/10 to-transparent sm:mb-4" />
        <div
          className="relative overflow-hidden rounded-[28px] px-4 py-8 text-center sm:rounded-[34px] sm:px-10 sm:py-14"
          style={{
            background:
              "radial-gradient(circle at top, rgba(34, 197, 94, 0.12), transparent 35%), linear-gradient(180deg, rgba(8, 15, 21, 0.92) 0%, rgba(8, 15, 21, 0.84) 100%)",
            border: "1px solid rgba(148, 163, 184, 0.14)",
            boxShadow: "0 30px 90px rgba(2, 12, 17, 0.42)",
          }}
        >
          <motion.div
            className="pointer-events-none absolute inset-x-16 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
            animate={{ opacity: [0.18, 0.82, 0.18] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="mx-auto mb-5 flex w-fit justify-center sm:mb-6">
            <BrandLogo
              size="lg"
              showText={false}
              markClassName="bg-white/[0.08]"
            />
          </div>
          <p className="label-brand text-xs font-semibold uppercase tracking-[0.24em]">
            Son Söz
          </p>
          <h2 className="mt-4 text-[2rem] font-semibold tracking-tight text-white leading-[1.05] sm:text-4xl md:text-5xl md:leading-[1.04]">
            Geçmişi Değiştiremezsin
            <span className="block text-gradient">Ama Hesaplayabilirsin</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[22rem] text-[0.98rem] leading-7 text-slate-400 sm:mt-5 sm:max-w-2xl sm:text-lg sm:leading-8">
            "Keşke Alsaydım?" dediğin anı aç, sonucu gör ve bir sonraki hamleni
            belirle.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[22px] bg-primary px-7 py-4 text-base font-semibold text-slate-950 transition hover:bg-primary/90 sm:min-h-0"
            >
              Ücretsiz Başla
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.04] px-7 py-4 text-base font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.07] sm:min-h-0"
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
    <footer className="relative pb-7 pt-1 sm:pb-8 sm:pt-2">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-7 border-t border-white/8 pt-7 text-center sm:gap-8 sm:pt-8 lg:flex-row lg:items-end lg:justify-between lg:text-left">
          <div className="mx-auto max-w-lg lg:mx-0">
            <Link to="/" className="inline-flex justify-center lg:justify-start">
              <BrandLogo />
            </Link>
            <p className="mt-4 text-base leading-8 text-slate-500">
              Geçmiş yatırım kararlarını, aklındakilerini ve hayallerini sade,
              net ve güçlü bir görsel akışla incele.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm text-slate-400 lg:justify-end">
            <a href="#demo" className="transition hover:text-white">
              Demo
            </a>
            <a href="#features" className="transition hover:text-white">
              Özellikler
            </a>
            <a href="#compare" className="transition hover:text-white">
              Karşılaştır
            </a>
            <Link to="/register" className="transition hover:text-white">
              Kayıt ol
            </Link>
            <Link to="/login" className="transition hover:text-white">
              Giriş yap
            </Link>
          </div>
        </div>

        <div className="mt-7 border-t border-white/6 pt-5 text-center text-xs text-slate-600 sm:mt-8 sm:pt-6 lg:text-left">
          © 2026 Keşke Alsaydım. Veriler bilgilendirme amaçlıdır, yatırım
          tavsiyesi değildir.
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const [navSolid, setNavSolid] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (value) => {
    setNavSolid(value > 28);
  });

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#071116] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "radial-gradient(circle at top, black 20%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(circle at top, black 20%, transparent 70%)",
          }}
        />
        <div
          className="absolute left-1/2 top-0 h-[420px] w-[72vw] -translate-x-1/2 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(34, 197, 94, 0.14) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute right-0 top-[18%] h-[420px] w-[420px] blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(56, 189, 248, 0.10) 0%, transparent 72%)",
          }}
        />
      </div>

      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-30 border-b transition"
        style={{
          background: navSolid
            ? "rgba(7, 17, 22, 0.82)"
            : "rgba(7, 17, 22, 0.42)",
          backdropFilter: "blur(18px)",
          borderColor: navSolid ? "rgba(148, 163, 184, 0.10)" : "transparent",
        }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[68px] items-center justify-between gap-4">
            <Link to="/" aria-label="Keşke Alsaydım ana sayfa">
              <BrandLogo />
            </Link>

            <div className="hidden items-center gap-7 md:flex">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm text-slate-400 transition hover:text-white"
                >
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

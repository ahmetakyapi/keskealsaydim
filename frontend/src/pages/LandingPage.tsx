import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  LayoutDashboard,
  Menu,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/error-state';
import { ShimmerBlock } from '@/components/ui/skeleton';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { BrandLogo } from '@/components/BrandLogo';
import { MarketTicker } from '@/components/MarketTicker';
import { SymbolSearch } from '@/components/SymbolSearch';
import { HeroCompareChart } from '@/components/compare/HeroCompareChart';
import { Reveal, RevealGroup, RevealItem, ScrollProgress } from '@/components/Motion';
import { SplitText } from '@/components/fx/SplitText';
import { Magnetic } from '@/components/fx/Magnetic';
import { PointerAurora } from '@/components/fx/PointerAurora';
import { VelocityMarquee } from '@/components/fx/VelocityMarquee';
import { ScrollHighlight } from '@/components/fx/ScrollHighlight';
import { SectionHeading } from '@/components/fx/SectionHeading';
import { GiantWordmark } from '@/components/fx/GiantWordmark';
import { RollText } from '@/components/fx/RollText';
import { useSmoothScroll } from '@/components/fx/SmoothScroll';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { StepsShowcase } from '@/components/landing/StepsShowcase';
import { TodayMovers } from '@/components/landing/TodayMovers';
import { PopularComparisons } from '@/components/landing/PopularComparisons';
import { FaqAccordion } from '@/components/landing/FaqAccordion';
import { useDemoComparison, useMarketOverview } from '@/hooks/useQueries';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useMotionStore } from '@/stores/motionStore';
import { cn, EASE_BRAND, formatCurrency, formatLongDate, formatNumber } from '@/lib/utils';

/**
 * The landing page runs the product, it does not mock it.
 *
 * The previous version shipped a snapshot of hand-entered prices that were
 * months old, labelled the last one "Bugünkü değer", and printed USD series
 * with a ₺ sign. Every figure here comes from the same public compare
 * endpoint the app itself uses, so what a visitor sees is the real answer —
 * and they can change the inputs and watch it recompute.
 */

const PRESETS = [
  { label: 'THYAO / ASELS', a: 'THYAO', b: 'ASELS' },
  { label: 'GARAN / BIMAS', a: 'GARAN', b: 'BIMAS' },
  { label: 'EREGL / TUPRS', a: 'EREGL', b: 'TUPRS' },
  { label: 'THYAO / NVDA', a: 'THYAO', b: 'NVDA' },
] as const;

const AMOUNTS = [1_000, 10_000, 100_000] as const;

const RANGES = [
  { label: '1 Yıl', years: 1 },
  { label: '3 Yıl', years: 3 },
  { label: '5 Yıl', years: 5 },
] as const;

const COMPARISON_ROWS = [
  {
    step: 'Geçmiş Fiyat Bulma',
    manual: 'Her hisse için ayrı ayrı tarihsel kapanış aramak',
    app: 'İki sembol yazın, veri otomatik gelsin',
  },
  {
    step: 'Kur Çevrimi',
    manual: 'ABD hisseleri için her günün kurunu elle bulmak',
    app: 'Her işlem gününün kuruyla otomatik çevrim',
  },
  {
    step: 'Temettü ve Bölünme',
    manual: 'Düzeltilmiş fiyatı ayrıca hesaplamak',
    app: 'Düzeltilmiş kapanış varsayılan olarak kullanılır',
  },
  {
    step: 'Risk Ölçümü',
    manual: 'Oynaklık ve korelasyon için formül kurmak',
    app: 'Oynaklık, korelasyon ve en sert düşüş hazır',
  },
  {
    step: 'Paylaşma',
    manual: 'Ekran görüntüsü almak',
    app: 'Canlı bağlantı, alıcı hesap açmadan görür',
  },
] as const;

const FAQ = [
  {
    q: 'Veriler Nereden Geliyor?',
    a: 'Fiyat ve geçmiş veriler Yahoo Finance üzerinden alınır. Veriler 15 dakikaya kadar gecikmeli olabilir ve yalnızca bilgilendirme amaçlıdır.',
  },
  {
    q: 'Yabancı Hisseler Nasıl Hesaplanıyor?',
    a: 'ABD hisseleri dolar cinsinden işlem görür. Karşılaştırma ve portföy toplamları her işlem gününün kuruyla Türk lirasına çevrilir; böylece kur hareketi de sonuca yansır. Bugünkü kurla toptan çevirmek yanlış sonuç verirdi.',
  },
  {
    q: 'Ücretli mi?',
    a: 'Hayır. Karşılaştırma, portföy takibi, izleme listesi ve fiyat alarmları ücretsizdir. Kredi kartı istemiyoruz.',
  },
  {
    q: 'Yatırım Tavsiyesi Veriyor musunuz?',
    a: 'Hayır. Uygulama yalnızca geçmiş fiyatlara dayalı hesaplama yapar. Geçmiş performans gelecekteki getirinin göstergesi değildir.',
  },
] as const;

const MANIFESTO =
  'Herkesin bir keşkesi var. O gün almadığınız hisse bugün kaç lira ederdi? Tahmin etmek yerine hesaplayın: gerçek kapanış fiyatlarıyla, her günün kuruyla, temettüsüyle birlikte. Sonra bir sonraki kararınızı rakama bakarak verin.';

/* Written already-uppercase with the dotted İ; never run through a transform. */
const MARQUEE_WORDS = ['KEŞKE ALSAYDIM', 'KARŞILAŞTIR', 'HESAPLA', 'TAKİP ET', 'PAYLAŞ'] as const;
const MARQUEE_TICKERS = ['THYAO', 'ASELS', 'GARAN', 'BIMAS', 'NVDA', 'EREGL', 'TUPRS', 'AAPL', 'SISE', 'KCHOL'] as const;

const NAV_LINKS = [
  { href: '#demo', label: 'Deneyin' },
  { href: '#ozellikler', label: 'Özellikler' },
  { href: '#nasil', label: 'Nasıl Çalışır' },
  { href: '#sss', label: 'Sık Sorulanlar' },
] as const;

export default function LandingPage() {
  useDocumentTitle();
  useSmoothScroll();
  const reduced = usePrefersReducedMotion();
  const introDone = useMotionStore((state) => state.introDone);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { resolvedTheme, setTheme } = useThemeStore();

  const [symbolA, setSymbolA] = useState<string>(PRESETS[0].a);
  const [symbolB, setSymbolB] = useState<string>(PRESETS[0].b);
  const [years, setYears] = useState<number>(3);
  const [amount, setAmount] = useState<number>(10_000);
  const [menuOpen, setMenuOpen] = useState(false);

  // A query, not a mutation fired from an effect: the cache key carries the
  // inputs, so a fast preset switch cannot leave a stale chart on screen and
  // revisiting a combination is instant.
  const demo = useDemoComparison(symbolA, symbolB, years, amount);
  const result = demo.data ?? null;
  // Only for the live stat band; the ticker fetches the same cached query.
  const market = useMarketOverview();

  const winnerIsB = result?.result.difference.winnerSymbol === 'B';
  const winnerSymbol = result ? (winnerIsB ? result.symbolB : result.symbolA) : '';
  const winnerLeg = result ? (winnerIsB ? result.result.symbolB : result.result.symbolA) : null;
  const loserLeg = result ? (winnerIsB ? result.result.symbolA : result.result.symbolB) : null;
  const gap = winnerLeg && loserLeg ? winnerLeg.endValue - loserLeg.endValue : 0;

  // Header slides away while reading down and returns on the first scroll up.
  const { scrollY } = useScroll();
  const [headerHidden, setHeaderHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(latest > 12);
    setHeaderHidden(latest > previous && latest > 320 && !menuOpen);
  });

  // Hero parallax: as the hero scrolls out, the pitch drifts up and fades
  // while the product card tips back and settles — depth without a loop.
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const pitchY = useTransform(heroProgress, [0, 1], [0, 140]);
  const pitchOpacity = useTransform(heroProgress, [0, 0.7], [1, 0]);
  const cardRotate = useTransform(heroProgress, [0, 1], [0, 12]);
  const cardScale = useTransform(heroProgress, [0, 1], [1, 0.9]);
  const cardY = useTransform(heroProgress, [0, 1], [0, 80]);

  return (
    // `overflow-x-clip`, not `hidden`: hidden turns this into a scroll
    // container, which silently breaks every `position: sticky` inside it
    // (the header, and the pinned horizontal section).
    <div className="relative min-h-dvh overflow-x-clip">
      <a
        href="#demo"
        className="sr-only-focusable fixed left-4 top-4 z-[60] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        İçeriğe atla
      </a>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.header
        className={cn(
          'sticky top-0 z-30 border-b backdrop-blur-xl transition-[background-color,border-color] duration-500',
          scrolled ? 'border-border bg-surface/85' : 'border-transparent bg-surface/40'
        )}
        animate={{ y: headerHidden && !reduced ? '-100%' : '0%' }}
        transition={{ duration: 0.45, ease: EASE_BRAND }}
      >
        <ScrollProgress />
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" aria-label="Keşke Alsaydım ana sayfa" className="transition-transform duration-300 hover:scale-[1.03]">
            <BrandLogo size="sm" />
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Bölümler">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <RollText>{item.label}</RollText>
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label={resolvedTheme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
            >
              {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {isAuthenticated ? (
              <Button size="sm" asChild>
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Panele Git
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link to="/login">Giriş Yap</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">Ücretsiz Başla</Link>
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label={menuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.nav
            className="overflow-hidden border-t border-border px-4 md:hidden"
            aria-label="Bölümler"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_BRAND }}
          >
            <ul className="space-y-1 py-3">
              {NAV_LINKS.map((item, index) => (
                <motion.li
                  key={item.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: EASE_BRAND, delay: 0.05 + index * 0.05 }}
                >
                  <a
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {item.label}
                  </a>
                </motion.li>
              ))}
              {!isAuthenticated && (
                <li>
                  <Link
                    to="/login"
                    className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Giriş Yap
                  </Link>
                </li>
              )}
            </ul>
          </motion.nav>
        )}
        </AnimatePresence>
      </motion.header>

      <MarketTicker />

      <main>
        {/*
          ── Hero + live demo ─────────────────────────────────────────────
          One section, two columns: the pitch on the left, the working
          product on the right. `hero-fit` makes it occupy exactly one
          screen below the chrome from lg up; below that the columns stack
          and the section grows naturally.
        */}
        <section ref={heroRef} id="demo" className="scroll-anchor relative">
          {/* Clipped in its own layer so the blooms can't widen the page,
              while the section itself stays unclipped for the symbol
              search dropdown. */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <PointerAurora />
          </div>

          <div className="hero-fit relative mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10 lg:py-8 xl:gap-14">
            {/* Left: the pitch */}
            <motion.div
              className="text-center lg:text-left"
              style={reduced ? undefined : { y: pitchY, opacity: pitchOpacity }}
            >
              <HeroIn play={introDone}>
                <Badge variant="default" className="mb-5">
                  <span className="live-dot relative h-1.5 w-1.5 rounded-full bg-primary before:bg-primary" aria-hidden="true" />
                  Gerçek Piyasa Verisiyle Çalışır
                </Badge>
              </HeroIn>

              <h1 className="display hero-title">
                <SplitText
                  text="Keşke Onu Alsaydım"
                  play={introDone}
                  delay={0.1}
                  wordClassName={(word) => (word === 'Alsaydım' ? 'text-primary' : undefined)}
                />
              </h1>
              <p className="display-sm hero-subtitle mt-2 text-muted-foreground">
                <SplitText text="Demeden Önce Rakamı Görün" play={introDone} delay={0.4} stagger={0.05} />
              </p>

              <HeroIn play={introDone} delay={0.6}>
                <p className="hero-lede mx-auto mt-5 max-w-xl text-muted-foreground lg:mx-0">
                  Aynı parayı başka bir hisseye koysaydınız bugün elinizde ne olurdu? Geçmiş
                  fiyatlarla hesaplayın, portföyünüzü takip edin, sonucu paylaşın.
                </p>
              </HeroIn>

              <HeroIn play={introDone} delay={0.72}>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  <Magnetic>
                    <Button size="lg" asChild className="group">
                      <Link
                        to={isAuthenticated ? '/compare' : '/register'}
                        data-cursor-label="Başla"
                      >
                        {isAuthenticated ? 'Karşılaştırma Yap' : 'Ücretsiz Hesap Oluştur'}
                        <ArrowRight
                          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </Link>
                    </Button>
                  </Magnetic>
                  <Magnetic>
                    <Button size="lg" variant="outline" asChild>
                      <a href="#ozellikler">Özellikleri İncele</a>
                    </Button>
                  </Magnetic>
                </div>
              </HeroIn>

              <HeroIn play={introDone} delay={0.84}>
                <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground lg:justify-start">
                  {['Kayıt Olmadan Deneyin', 'Kredi Kartı Yok', 'Türk Lirası Bazlı'].map((item) => (
                    <li key={item} className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-success" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </HeroIn>
            </motion.div>

            {/* Right: the product, running */}
            <HeroIn play={introDone} delay={0.3} className="min-w-0 [perspective:1400px]">
              <motion.div
                style={
                  reduced
                    ? undefined
                    : { rotateX: cardRotate, scale: cardScale, y: cardY, transformOrigin: 'center top' }
                }
              >
              <Card className="lit-edge overflow-hidden border-primary/20 shadow-[0_40px_120px_-40px_hsl(var(--primary)/0.45)]">
                <div className="border-b border-border bg-surface-raised/50 p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="eyebrow text-muted-foreground">CANLI HESAP</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESETS.map((preset) => {
                        const active = symbolA === preset.a && symbolB === preset.b;
                        return (
                          <Button
                            key={preset.label}
                            variant={active ? 'secondary' : 'outline'}
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            aria-pressed={active}
                            onClick={() => {
                              setSymbolA(preset.a);
                              setSymbolB(preset.b);
                            }}
                          >
                            {preset.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <SymbolSearch
                      label="Aldığınız Hisse"
                      value={symbolA}
                      onSelect={(item) => setSymbolA(item.symbol)}
                    />
                    <SymbolSearch
                      label="Alabileceğiniz Hisse"
                      value={symbolB}
                      onSelect={(item) => setSymbolB(item.symbol)}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
                    <fieldset>
                      <legend className="mb-1 text-xs text-muted-foreground">Yatırım Tutarı</legend>
                      <div className="flex gap-1.5">
                        {AMOUNTS.map((value) => (
                          <Button
                            key={value}
                            variant={amount === value ? 'secondary' : 'outline'}
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            aria-pressed={amount === value}
                            onClick={() => setAmount(value)}
                          >
                            {formatCurrency(value).replace(',00', '')}
                          </Button>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend className="mb-1 text-xs text-muted-foreground">Dönem</legend>
                      <div className="flex gap-1.5">
                        {RANGES.map((range) => (
                          <Button
                            key={range.label}
                            variant={years === range.years ? 'secondary' : 'outline'}
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            aria-pressed={years === range.years}
                            onClick={() => setYears(range.years)}
                          >
                            {range.label}
                          </Button>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                </div>

                <CardContent className="p-3.5 sm:p-4">
                  {demo.isPending ? (
                    <div className="space-y-3">
                      <ShimmerBlock className="h-24 w-full rounded-xl" />
                      <ShimmerBlock className="hero-chart w-full rounded-xl" />
                    </div>
                  ) : demo.isError ? (
                    <ErrorState
                      error={demo.error}
                      title="Örnek hesaplanamadı"
                      onRetry={() => void demo.refetch()}
                      retrying={demo.isFetching}
                      compact
                    />
                  ) : result && winnerLeg && loserLeg ? (
                    <>
                      <div
                        className={cn(
                          'rounded-xl border p-3.5',
                          winnerIsB
                            ? 'border-danger/25 bg-danger/[0.05]'
                            : 'border-success/25 bg-success/[0.05]'
                        )}
                        // Recomputes as the visitor changes inputs; announce it.
                        role="status"
                        aria-live="polite"
                      >
                        <p className="text-xs text-muted-foreground">
                          {formatLongDate(result.startDate)} tarihinde{' '}
                          {formatCurrency(result.amount)} ile
                        </p>
                        <p className="display-sm mt-1 text-lg leading-snug sm:text-xl">
                          <span className={winnerIsB ? 'text-danger' : 'text-success'}>
                            {winnerSymbol}
                          </span>{' '}
                          alsaydınız{' '}
                          <AnimatedNumber
                            value={Math.abs(gap)}
                            format="currency"
                            className="font-bold"
                          />{' '}
                          daha fazlanız olurdu.
                        </p>

                        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[
                            {
                              label: result.symbolA,
                              value: result.result.symbolA.endValue,
                              percent: result.result.symbolA.profitPercent,
                            },
                            {
                              label: result.symbolB,
                              value: result.result.symbolB.endValue,
                              percent: result.result.symbolB.profitPercent,
                            },
                          ].map((leg) => (
                            <div key={leg.label}>
                              <dt className="text-[11px] text-muted-foreground">{leg.label}</dt>
                              <dd className="text-base font-semibold">
                                <AnimatedNumber value={leg.value} format="currency" />
                              </dd>
                              <dd className="text-[11px]">
                                <AnimatedNumber
                                  value={leg.percent}
                                  format="percent"
                                  className={leg.percent >= 0 ? 'text-success' : 'text-danger'}
                                />
                              </dd>
                            </div>
                          ))}

                          <div>
                            <dt className="text-[11px] text-muted-foreground">Fark</dt>
                            <dd className="text-base font-semibold" data-numeric="">
                              {formatNumber(Math.abs(result.result.difference.percentagePoints))}{' '}
                              puan
                            </dd>
                            <dd className="text-[11px] text-muted-foreground">
                              {result.result.metrics.tradingDays} işlem günü
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[11px] text-muted-foreground">En Sert Düşüş</dt>
                            <dd className="text-base font-semibold" data-numeric="">
                              %{formatNumber(winnerLeg.maxDrawdown)}
                            </dd>
                            <dd className="text-[11px] text-muted-foreground">
                              {winnerSymbol} için
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <HeroCompareChart
                        className="mt-4"
                        chartClassName="hero-chart"
                        series={result.result.series}
                        symbolA={result.symbolA}
                        symbolB={result.symbolB}
                        amount={result.amount}
                      />

                      {(result.result.symbolA.currency !== 'TRY' ||
                        result.result.symbolB.currency !== 'TRY') && (
                        <p className="mt-2.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                          <ShieldCheck
                            className="mt-0.5 h-3 w-3 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          Yabancı para birimindeki hisse, her işlem gününün kuruyla Türk lirasına
                          çevrildi.
                        </p>
                      )}
                    </>
                  ) : null}
                </CardContent>
              </Card>
              </motion.div>
            </HeroIn>
          </div>

          {/* Scroll cue — desktop only, where the hero fills the screen. */}
          <HeroIn
            play={introDone}
            delay={1.1}
            className="pointer-events-none absolute inset-x-0 bottom-4 hidden justify-center lg:flex"
          >
            <span className="flex flex-col items-center gap-2 text-[11px] text-muted-foreground">
              Kaydırın
              <span className="relative h-9 w-px overflow-hidden bg-border">
                <span className="scroll-cue absolute inset-x-0 top-0 h-1/2 bg-primary" />
              </span>
            </span>
          </HeroIn>
        </section>

        <MarqueeBand />

        {/*
          ── Facts ──────────────────────────────────────────────────────────
          Four short, checkable claims. The earlier version padded this band
          with derived trivia ("752 gün · Hesaplanan İşlem Günü · Yandaki
          örnek için") that referred to a panel no longer beside it and told
          the visitor nothing about whether to sign up.
        */}
        <section className="border-y border-border bg-surface/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-9">
            <RevealGroup className="grid grid-cols-2 gap-x-6 gap-y-7 lg:grid-cols-4" stagger={0.07}>
              {[
                {
                  value: market.data?.requestedSymbols ?? 43,
                  format: 'integer' as const,
                  label: 'Canlı Sembol',
                },
                { value: 10, format: 'integer' as const, label: 'Para Birimi' },
                { value: 1990, format: 'integer' as const, label: 'Veri Başlangıcı' },
                { value: 0, format: 'integer' as const, prefix: '₺', label: 'Aylık Ücret' },
              ].map((stat) => (
                <RevealItem key={stat.label} className="border-l border-border pl-5">
                  <p className="display text-4xl text-primary sm:text-5xl">
                    <AnimatedNumber
                      value={stat.value}
                      format={stat.format}
                      prefix={'prefix' in stat ? stat.prefix : undefined}
                      decimals={0}
                      startOnView
                    />
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{stat.label}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── Manifesto ────────────────────────────────────────────────────
            The pitch in one paragraph, lit word by word at the reader's own
            scroll pace. */}
        <section className="relative">
          <div className="mx-auto w-full max-w-5xl px-4 py-24 sm:py-32">
            <p className="eyebrow mb-8 flex items-center gap-3 text-primary">
              <span className="font-mono text-muted-foreground">00</span>
              <span className="h-px w-12 bg-primary/60" aria-hidden="true" />
              NEDEN VAR
            </p>
            <ScrollHighlight
              text={MANIFESTO}
              highlight={['keşkesi', 'hesaplayın:', 'rakama']}
              className="display-sm text-[clamp(1.6rem,3.4vw,3rem)] leading-[1.15]"
            />
          </div>
        </section>

        {/* ── Feature showcase ─────────────────────────────────────────── */}
        <section id="ozellikler" className="scroll-anchor relative border-b border-border">
          <div
            className="bloom left-1/2 top-16 h-64 w-[36rem] -translate-x-1/2 bg-primary/12"
            aria-hidden="true"
          />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
            <SectionHeading
              index="01"
              eyebrow="ÖZELLİKLER"
              title="Neler Yapabilirsiniz"
              description="Bir özelliği seçin, o ekranı olduğu gibi görün."
            />

            <Reveal delay={0.06}>
              <FeatureShowcase />
            </Reveal>
          </div>
        </section>

        {/* ── Walkthrough ──────────────────────────────────────────────── */}
        <section id="nasil" className="scroll-anchor relative overflow-hidden bg-surface/40">
          <div className="bloom right-0 top-1/4 h-72 w-72 bg-secondary/15" aria-hidden="true" />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
            <SectionHeading
              index="02"
              eyebrow="NASIL ÇALIŞIR"
              title="Üç Adımda Sonuç"
              description="Adımlar kendiliğinden ilerler; istediğiniz adıma tıklayarak durdurabilirsiniz."
            />

            <Reveal delay={0.06}>
              <StepsShowcase />
            </Reveal>
          </div>
        </section>

        {/* ── Live movers ──────────────────────────────────────────────── */}
        <section className="relative border-y border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
            <SectionHeading
              index="03"
              eyebrow="CANLI PİYASA"
              title="Bugün Piyasada Ne Oluyor"
              description="Aşağıdaki liste şu anki fiyatlardan hesaplanıyor. Bir hisseye tıklayarak detayını açabilirsiniz."
            />

            <Reveal delay={0.06}>
              <TodayMovers />
            </Reveal>
          </div>
        </section>

        {/* ── Popular comparisons (pinned horizontal scroll on desktop) ──── */}
        <PopularComparisons />

        {/* ── Manual vs product ────────────────────────────────────────── */}
        <section className="relative border-y border-border bg-surface/40">
          <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:py-20">
            <SectionHeading index="05" eyebrow="KARŞILAŞTIRMA" title="Elle Hesaplamakla Arasındaki Fark" />

            <Reveal delay={0.06}>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Elle hesaplama ile Keşke Alsaydım karşılaştırması
                  </caption>
                  <thead>
                    <tr className="border-b border-border bg-surface-raised/60 text-left">
                      <th scope="col" className="p-4 font-medium">
                        Adım
                      </th>
                      <th scope="col" className="p-4 font-medium text-muted-foreground">
                        Elle / Excel
                      </th>
                      <th scope="col" className="p-4 font-medium text-primary">
                        Keşke Alsaydım
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {COMPARISON_ROWS.map((row, index) => (
                      <motion.tr
                        key={row.step}
                        className="transition-colors hover:bg-primary/[0.04]"
                        initial={reduced ? false : { opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.6 }}
                        transition={{ duration: 0.6, ease: EASE_BRAND, delay: index * 0.07 }}
                      >
                        <th scope="row" className="p-4 text-left font-medium">
                          {row.step}
                        </th>
                        <td className="p-4 text-muted-foreground">{row.manual}</td>
                        <td className="p-4">
                          <span className="flex items-start gap-1.5">
                            <Check
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success"
                              aria-hidden="true"
                            />
                            {row.app}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section id="sss" className="scroll-anchor relative">
          <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-20">
            <SectionHeading index="06" eyebrow="SIK SORULANLAR" title="Merak Edilenler" />

            <Reveal delay={0.06}>
              <FaqAccordion items={FAQ} />
            </Reveal>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-t border-border">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <PointerAurora />
          </div>

          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-24 sm:py-32 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="text-center lg:text-left">
              <p className="eyebrow flex items-center justify-center gap-3 text-primary lg:justify-start">
                <span className="font-mono text-muted-foreground">07</span>
                <span className="h-px w-12 bg-primary/60" aria-hidden="true" />
                BAŞLAYIN
              </p>
              <h2 className="display mt-4 text-[clamp(2.5rem,6vw,5.5rem)]">
                <SplitText
                  text="Bir Sonraki Keşkeyi Yaşamadan Hesaplayın"
                  trigger="view"
                  wordClassName={(word) => (word === 'Hesaplayın' ? 'text-primary' : undefined)}
                />
              </h2>
              <Reveal delay={0.2}>
                <p className="mx-auto mt-6 max-w-lg text-sm text-muted-foreground sm:text-base lg:mx-0">
                  Hesap oluşturun, portföyünüzü ekleyin, senaryolarınızı kaydedin ve paylaşın.
                  Tamamı ücretsiz.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  <Button size="lg" variant="outline" asChild>
                    <a href="#demo">Önce Deneyin</a>
                  </Button>
                </div>
              </Reveal>
            </div>

            {/* The big round button: magnetic, fills from the bottom on hover. */}
            <Reveal from="none" className="flex justify-center">
              <Magnetic strength={0.4}>
                <Link
                  to={isAuthenticated ? '/dashboard' : '/register'}
                  data-cursor-label="Hadi"
                  className="group relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border border-primary/40 text-primary transition-colors duration-500 hover:text-primary-foreground sm:h-56 sm:w-56"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 translate-y-full rounded-full bg-primary transition-transform duration-700 ease-brand group-hover:translate-y-0"
                  />
                  <span className="relative flex flex-col items-center gap-2">
                    <ArrowUpRight
                      className="h-8 w-8 transition-transform duration-500 ease-brand group-hover:rotate-45"
                      aria-hidden="true"
                    />
                    <span className="display-sm text-lg">
                      {isAuthenticated ? 'Panele Git' : 'Ücretsiz Başla'}
                    </span>
                  </span>
                </Link>
              </Magnetic>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <BrandLogo size="sm" />
              <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                Geçmişe dönük yatırım senaryolarını gerçek fiyatlarla hesaplayan, portföyünüzü
                Türk lirası bazında takip eden açık bir araç.
              </p>
            </div>

            <nav aria-labelledby="footer-product">
              <h2 id="footer-product" className="display-sm text-sm">
                Ürün
              </h2>
              <ul className="mt-3 space-y-2">
                {[
                  { href: '#demo', label: 'Canlı Deneyin' },
                  { href: '#ozellikler', label: 'Özellikler' },
                  { href: '#nasil', label: 'Nasıl Çalışır' },
                  { href: '#sss', label: 'Sık Sorulanlar' },
                ].map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="link-draw text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-labelledby="footer-account">
              <h2 id="footer-account" className="display-sm text-sm">
                Hesap
              </h2>
              <ul className="mt-3 space-y-2">
                {(isAuthenticated
                  ? [
                      { to: '/dashboard', label: 'Panel' },
                      { to: '/compare', label: 'Karşılaştır' },
                      { to: '/portfolio', label: 'Portföyüm' },
                      { to: '/settings', label: 'Ayarlar' },
                    ]
                  : [
                      { to: '/register', label: 'Ücretsiz Kayıt' },
                      { to: '/login', label: 'Giriş Yap' },
                    ]
                ).map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="link-draw text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Veriler Yahoo Finance kaynaklıdır ve 15 dakikaya kadar gecikmeli olabilir.
            </p>
            <p className="text-xs text-muted-foreground">
              Yatırım tavsiyesi değildir. Geçmiş performans gelecekteki getirinin göstergesi
              değildir.
            </p>
          </div>
        </div>

        {/* Edge-to-edge sign-off. Sized in vw so it always spans the width. */}
        <div className="overflow-hidden px-4 pb-4">
          <GiantWordmark className="text-center text-[10.4vw]" />
        </div>
      </footer>
    </div>
  );
}

/**
 * Hero entrance that waits for the preloader. Under reduced motion it is a
 * plain div; otherwise it holds hidden until `play`, then rises in.
 */
function HeroIn({
  children,
  className,
  delay = 0,
  play,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  play: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.9, ease: EASE_BRAND, delay: play ? delay : 0 }}
    >
      {children}
    </motion.div>
  );
}

function MarqueeBand() {
  return (
    <section aria-label="Keşke Alsaydım" className="relative overflow-hidden border-y border-border bg-surface/40 py-6 sm:py-8">
      <VelocityMarquee baseVelocity={-2.5}>
        {MARQUEE_WORDS.map((word) => (
          <span
            key={word}
            className="display flex items-center gap-6 pr-6 text-[clamp(2.75rem,7vw,6rem)] leading-none sm:gap-10 sm:pr-10"
          >
            {word}
            <Sparkles className="h-[0.45em] w-[0.45em] text-primary" aria-hidden="true" />
          </span>
        ))}
      </VelocityMarquee>
      <VelocityMarquee baseVelocity={2} className="mt-3 sm:mt-4">
        {MARQUEE_TICKERS.map((ticker) => (
          <span
            key={ticker}
            className="display-sm flex items-center gap-6 pr-6 font-mono text-[clamp(1.25rem,2.4vw,2rem)] text-muted-foreground sm:gap-10 sm:pr-10"
          >
            {ticker}
            <span className="h-1.5 w-1.5 rounded-full bg-primary/60" aria-hidden="true" />
          </span>
        ))}
      </VelocityMarquee>
    </section>
  );
}

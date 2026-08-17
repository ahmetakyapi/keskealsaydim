import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  LayoutDashboard,
  Menu,
  Moon,
  ShieldCheck,
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
import { FadeIn, Reveal, RevealGroup, RevealItem, ScrollProgress } from '@/components/Motion';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { StepsShowcase } from '@/components/landing/StepsShowcase';
import { TodayMovers } from '@/components/landing/TodayMovers';
import { PopularComparisons } from '@/components/landing/PopularComparisons';
import { FaqAccordion } from '@/components/landing/FaqAccordion';
import { useDemoComparison, useMarketOverview } from '@/hooks/useQueries';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn, formatCurrency, formatLongDate, formatNumber } from '@/lib/utils';

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

const NAV_LINKS = [
  { href: '#demo', label: 'Deneyin' },
  { href: '#ozellikler', label: 'Özellikler' },
  { href: '#nasil', label: 'Nasıl Çalışır' },
  { href: '#sss', label: 'Sık Sorulanlar' },
] as const;

export default function LandingPage() {
  useDocumentTitle();
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

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <a
        href="#demo"
        className="sr-only-focusable fixed left-4 top-4 z-[60] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        İçeriğe atla
      </a>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-xl">
        <ScrollProgress />
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" aria-label="Keşke Alsaydım ana sayfa">
            <BrandLogo size="sm" />
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Bölümler">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
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

        {menuOpen && (
          <nav className="border-t border-border px-4 py-3 md:hidden" aria-label="Bölümler">
            <ul className="space-y-1">
              {NAV_LINKS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {item.label}
                  </a>
                </li>
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
          </nav>
        )}
      </header>

      <MarketTicker />

      <main>
        {/*
          ── Hero + live demo ─────────────────────────────────────────────
          One section, two columns: the pitch on the left, the working
          product on the right. `hero-fit` makes it occupy exactly one
          screen below the chrome from lg up; below that the columns stack
          and the section grows naturally.
        */}
        <section id="demo" className="scroll-anchor relative">
          <div className="bloom -top-24 left-[4%] h-80 w-80 bg-primary/30" aria-hidden="true" />
          <div className="bloom -top-16 right-[2%] h-96 w-96 bg-secondary/25" aria-hidden="true" />
          <div
            className="bloom bottom-0 left-1/3 h-56 w-[30rem] bg-primary/10"
            aria-hidden="true"
          />

          <div className="hero-fit relative mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10 lg:py-8 xl:gap-14">
            {/* Left: the pitch */}
            <FadeIn className="text-center lg:text-left">
              <Badge variant="default" className="mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                Gerçek Piyasa Verisiyle Çalışır
              </Badge>

              <h1 className="display hero-title">Keşke Onu Alsaydım</h1>
              <p className="display-sm hero-subtitle mt-2 text-muted-foreground">
                Demeden Önce Rakamı Görün
              </p>

              <p className="hero-lede mx-auto mt-5 max-w-xl text-muted-foreground lg:mx-0">
                Aynı parayı başka bir hisseye koysaydınız bugün elinizde ne olurdu? Geçmiş
                fiyatlarla hesaplayın, portföyünüzü takip edin, sonucu paylaşın.
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Button size="lg" asChild>
                  <Link to={isAuthenticated ? '/compare' : '/register'}>
                    {isAuthenticated ? 'Karşılaştırma Yap' : 'Ücretsiz Hesap Oluştur'}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#ozellikler">Özellikleri İncele</a>
                </Button>
              </div>

              <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground lg:justify-start">
                {['Kayıt Olmadan Deneyin', 'Kredi Kartı Yok', 'Türk Lirası Bazlı'].map((item) => (
                  <li key={item} className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-success" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeIn>

            {/* Right: the product, running */}
            <FadeIn delay={0.08} className="min-w-0">
              <Card className="lit-edge overflow-hidden border-primary/20 shadow-2xl">
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
            </FadeIn>
          </div>
        </section>

        {/* ── Live stats ───────────────────────────────────────────────── */}
        <section className="border-y border-border bg-surface/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-10">
            <RevealGroup className="grid grid-cols-2 gap-6 lg:grid-cols-4" stagger={0.07}>
              {[
                {
                  value: market.data?.requestedSymbols ?? 43,
                  suffix: ' sembol',
                  label: 'Canlı Takip Edilen',
                  hint: 'BIST, ABD, döviz ve emtia',
                },
                {
                  value: result?.result.metrics.tradingDays ?? 750,
                  suffix: ' gün',
                  label: 'Hesaplanan İşlem Günü',
                  hint: 'Yandaki örnek için',
                },
                {
                  value: 10,
                  suffix: ' para birimi',
                  label: 'TL\'ye Çevrilen',
                  hint: 'Her işlem gününün kuruyla',
                },
                {
                  // A year, counted up, would render as "1.990" through the
                  // tr-TR thousands separator — so this is stated as a span.
                  value: new Date().getFullYear() - 1990,
                  suffix: ' yıl',
                  label: 'Geriye Dönük Veri',
                  hint: "1990'a kadar geçmiş fiyat",
                },
              ].map((stat) => (
                <RevealItem key={stat.label}>
                  <p className="display text-3xl text-primary sm:text-4xl">
                    <AnimatedNumber
                      value={stat.value}
                      decimals={0}
                      startOnView
                      suffix={stat.suffix}
                    />
                  </p>
                  <p className="mt-1.5 text-sm font-medium">{stat.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{stat.hint}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── Feature showcase ─────────────────────────────────────────── */}
        <section id="ozellikler" className="scroll-anchor relative border-b border-border">
          <div
            className="bloom left-1/2 top-16 h-64 w-[36rem] -translate-x-1/2 bg-primary/12"
            aria-hidden="true"
          />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
            <Reveal className="mb-10 text-center">
              <p className="eyebrow text-primary">ÖZELLİKLER</p>
              <h2 className="display mt-2 text-3xl sm:text-4xl">Neler Yapabilirsiniz</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                Bir özelliği seçin, o ekranı olduğu gibi görün.
              </p>
            </Reveal>

            <Reveal delay={0.06}>
              <FeatureShowcase />
            </Reveal>
          </div>
        </section>

        {/* ── Sticky walkthrough ───────────────────────────────────────── */}
        <section id="nasil" className="scroll-anchor relative overflow-hidden bg-surface/40">
          <div className="bloom right-0 top-1/3 h-72 w-72 bg-secondary/15" aria-hidden="true" />

          <div className="relative mx-auto w-full max-w-6xl px-4 pt-16 sm:pt-20">
            <Reveal className="text-center">
              <p className="eyebrow text-primary">NASIL ÇALIŞIR</p>
              <h2 className="display mt-2 text-3xl sm:text-4xl">Üç Adımda Sonuç</h2>
            </Reveal>
          </div>

          <div className="relative mx-auto w-full max-w-6xl px-4">
            <StepsShowcase />
          </div>
        </section>

        {/* ── Live movers ──────────────────────────────────────────────── */}
        <section className="relative border-y border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
            <Reveal className="mb-8 text-center">
              <p className="eyebrow text-primary">CANLI PİYASA</p>
              <h2 className="display mt-2 text-3xl sm:text-4xl">Bugün Piyasada Ne Oluyor</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                Aşağıdaki liste şu anki fiyatlardan hesaplanıyor. Bir hisseye tıklayarak
                detayını açabilirsiniz.
              </p>
            </Reveal>

            <Reveal delay={0.06}>
              <TodayMovers />
            </Reveal>
          </div>
        </section>

        {/* ── Popular comparisons ──────────────────────────────────────── */}
        <section className="relative">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
            <Reveal className="mb-8 text-center">
              <p className="eyebrow text-primary">HAZIR SENARYOLAR</p>
              <h2 className="display mt-2 text-3xl sm:text-4xl">Sık Merak Edilen Karşılaştırmalar</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                Birine tıklayın, hesap anında sizin için çalışsın.
              </p>
            </Reveal>

            <PopularComparisons />
          </div>
        </section>

        {/* ── Manual vs product ────────────────────────────────────────── */}
        <section className="relative border-y border-border bg-surface/40">
          <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:py-20">
            <Reveal className="mb-8 text-center">
              <p className="eyebrow text-primary">KARŞILAŞTIRMA</p>
              <h2 className="display mt-2 text-3xl sm:text-4xl">Elle Hesaplamakla Arasındaki Fark</h2>
            </Reveal>

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
                    {COMPARISON_ROWS.map((row) => (
                      <tr key={row.step}>
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
                      </tr>
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
            <Reveal className="mb-8 text-center">
              <p className="eyebrow text-primary">SIK SORULANLAR</p>
              <h2 className="display mt-2 text-3xl sm:text-4xl">Merak Edilenler</h2>
            </Reveal>

            <Reveal delay={0.06}>
              <FaqAccordion items={FAQ} />
            </Reveal>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-t border-border">
          <div
            className="bloom left-1/2 top-0 h-64 w-[44rem] -translate-x-1/2 bg-secondary/20"
            aria-hidden="true"
          />
          <div className="bloom bottom-0 left-1/4 h-56 w-96 bg-primary/15" aria-hidden="true" />

          <div className="relative mx-auto w-full max-w-3xl px-4 py-20 text-center">
            <Reveal>
              <h2 className="display text-3xl sm:text-4xl lg:text-5xl">
                Bir Sonraki Keşkeyi Yaşamadan Hesaplayın
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground sm:text-base">
                Hesap oluşturun, portföyünüzü ekleyin, senaryolarınızı kaydedin ve paylaşın.
                Tamamı ücretsiz.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" asChild>
                  <Link to={isAuthenticated ? '/dashboard' : '/register'}>
                    {isAuthenticated ? 'Panele Git' : 'Ücretsiz Başla'}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#demo">Önce Deneyin</a>
                </Button>
              </div>
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
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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
      </footer>
    </div>
  );
}

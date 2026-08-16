import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Check,
  GitCompare,
  LayoutDashboard,
  Menu,
  Moon,
  Share2,
  ShieldCheck,
  Sun,
  Wallet,
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
import { FadeIn } from '@/components/Motion';
import { useDemoComparison } from '@/hooks/useQueries';
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

const FEATURES = [
  {
    icon: GitCompare,
    title: 'Gerçek Fiyatlarla Karşılaştırma',
    description:
      'İki hisseyi seçtiğiniz aralıkta gün gün karşılaştırın. Oynaklık, korelasyon ve en sert düşüş dahil.',
    points: ['Günlük kurla TL çevrimi', 'Zaman serisi grafiği', 'Risk göstergeleri'],
  },
  {
    icon: Wallet,
    title: 'Portföy Takibi',
    description:
      'Komisyonuyla birlikte alış kaydedin; güncel değer, ağırlık ve satış sonrası gerçekleşen kâr tek ekranda.',
    points: ['Kısmi ve tam satış', 'Dağılım grafiği', 'CSV dışa aktarma'],
  },
  {
    icon: BellRing,
    title: 'Fiyat Alarmları',
    description:
      'Bir hisse belirlediğiniz seviyeye ulaştığında bildirim listenize düşsün. Takip etmeyi bırakın.',
    points: ['Üst ve alt sınır', 'Bildirim gelen kutusu', 'Süreli alarm'],
  },
  {
    icon: Share2,
    title: 'Paylaşılabilir Senaryolar',
    description:
      'Hesapladığınız senaryoyu kaydedin, bağlantısını paylaşın. Karşı taraf hesap açmadan sonucu görür.',
    points: ['Genel bağlantı', 'Görüntülenme sayısı', 'Favorilere ekleme'],
  },
] as const;

const STEPS = [
  {
    title: 'İki Hisse Seçin',
    description:
      'Aldığınız hisseyi ve merak ettiğiniz alternatifi yazın. BIST ve ABD borsaları desteklenir.',
  },
  {
    title: 'Tarih ve Tutar Girin',
    description:
      'Ne zaman, ne kadarla girdiğinizi belirtin. Geçmiş fiyatlar ve o günün kuru kullanılır.',
  },
  {
    title: 'Farkı Görün',
    description:
      'Gün gün değer gelişimi, kaçırdığınız tutar ve risk göstergeleri karşınıza çıkar.',
  },
] as const;

const FAQ = [
  {
    q: 'Veriler nereden geliyor?',
    a: 'Fiyat ve geçmiş veriler Yahoo Finance üzerinden alınır. Veriler 15 dakikaya kadar gecikmeli olabilir ve yalnızca bilgilendirme amaçlıdır.',
  },
  {
    q: 'Yabancı hisseler nasıl hesaplanıyor?',
    a: 'ABD hisseleri dolar cinsinden işlem görür. Karşılaştırma ve portföy toplamları her işlem gününün kuruyla Türk lirasına çevrilir; böylece kur hareketi de sonuca yansır. Bugünkü kurla toptan çevirmek yanlış sonuç verirdi.',
  },
  {
    q: 'Ücretli mi?',
    a: 'Hayır. Karşılaştırma, portföy takibi, izleme listesi ve fiyat alarmları ücretsizdir. Kredi kartı istemiyoruz.',
  },
  {
    q: 'Yatırım tavsiyesi veriyor musunuz?',
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
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative">
          <div className="grid-backdrop" aria-hidden="true" />
          <div className="bloom -top-24 left-[8%] h-72 w-72 bg-primary/25" aria-hidden="true" />
          <div className="bloom -top-16 right-[6%] h-80 w-80 bg-secondary/25" aria-hidden="true" />

          <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-14 sm:pt-20">
            <FadeIn className="text-center">
              <Badge variant="default" className="mb-6">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Gerçek piyasa verisiyle çalışır
              </Badge>

              <h1 className="display mx-auto max-w-4xl text-[2.5rem] sm:text-6xl lg:text-7xl">
                Keşke onu alsaydım
              </h1>
              <p className="display-sm mx-auto mt-3 max-w-3xl text-xl text-muted-foreground sm:text-2xl">
                demeden önce rakamı görün.
              </p>

              <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
                Aynı parayı başka bir hisseye koysaydınız bugün elinizde ne olurdu? Geçmiş
                fiyatlarla hesaplayın, portföyünüzü takip edin, sonucu paylaşın.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" asChild>
                  <Link to={isAuthenticated ? '/compare' : '/register'}>
                    {isAuthenticated ? 'Karşılaştırma Yap' : 'Ücretsiz Hesap Oluştur'}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#demo">Önce Deneyin</a>
                </Button>
              </div>

              <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {['Kayıt olmadan deneyin', 'Kredi kartı yok', 'Türk lirası bazlı'].map((item) => (
                  <span key={item} className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-success" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ── Interactive demo ─────────────────────────────────────────── */}
        <section id="demo" className="scroll-anchor relative pb-16">
          <div className="mx-auto w-full max-w-5xl px-4">
            <FadeIn delay={0.08}>
              <Card className="lit-edge overflow-hidden border-primary/20 shadow-2xl">
                {/* Controls */}
                <div className="border-b border-border bg-surface-raised/50 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="eyebrow text-muted-foreground">CANLI HESAP</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESETS.map((preset) => {
                        const active = symbolA === preset.a && symbolB === preset.b;
                        return (
                          <Button
                            key={preset.label}
                            variant={active ? 'secondary' : 'outline'}
                            size="sm"
                            className="h-7 px-2.5 text-xs"
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

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
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

                  <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
                    <fieldset>
                      <legend className="mb-1.5 text-xs text-muted-foreground">
                        Yatırım tutarı
                      </legend>
                      <div className="flex gap-1.5">
                        {AMOUNTS.map((value) => (
                          <Button
                            key={value}
                            variant={amount === value ? 'secondary' : 'outline'}
                            size="sm"
                            className="h-8"
                            aria-pressed={amount === value}
                            onClick={() => setAmount(value)}
                          >
                            {formatCurrency(value).replace(',00', '')}
                          </Button>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend className="mb-1.5 text-xs text-muted-foreground">Dönem</legend>
                      <div className="flex gap-1.5">
                        {RANGES.map((range) => (
                          <Button
                            key={range.label}
                            variant={years === range.years ? 'secondary' : 'outline'}
                            size="sm"
                            className="h-8"
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

                {/* Result */}
                <CardContent className="p-4 sm:p-6">
                  {demo.isPending ? (
                    <div className="space-y-4">
                      <ShimmerBlock className="h-32 w-full rounded-xl" />
                      <ShimmerBlock className="h-[300px] w-full rounded-xl" />
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
                          'rounded-xl border p-4 sm:p-5',
                          winnerIsB
                            ? 'border-danger/25 bg-danger/[0.05]'
                            : 'border-success/25 bg-success/[0.05]'
                        )}
                        // Recomputes as the visitor changes inputs; announce it.
                        role="status"
                        aria-live="polite"
                      >
                        <p className="text-sm text-muted-foreground">
                          {formatLongDate(result.startDate)} tarihinde{' '}
                          {formatCurrency(result.amount)} ile
                        </p>
                        <p className="display-sm mt-1.5 text-2xl leading-snug sm:text-3xl">
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

                        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
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
                              <dt className="text-xs text-muted-foreground">{leg.label}</dt>
                              <dd className="mt-0.5 text-lg font-semibold">
                                <AnimatedNumber value={leg.value} format="currency" />
                              </dd>
                              <dd className="text-xs">
                                <AnimatedNumber
                                  value={leg.percent}
                                  format="percent"
                                  className={leg.percent >= 0 ? 'text-success' : 'text-danger'}
                                />
                              </dd>
                            </div>
                          ))}

                          <div>
                            <dt className="text-xs text-muted-foreground">Fark</dt>
                            <dd className="mt-0.5 text-lg font-semibold" data-numeric="">
                              {formatNumber(Math.abs(result.result.difference.percentagePoints))}{' '}
                              puan
                            </dd>
                            <dd className="text-xs text-muted-foreground">
                              {result.result.metrics.tradingDays} işlem günü
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs text-muted-foreground">En sert düşüş</dt>
                            <dd className="mt-0.5 text-lg font-semibold" data-numeric="">
                              %{formatNumber(winnerLeg.maxDrawdown)}
                            </dd>
                            <dd className="text-xs text-muted-foreground">{winnerSymbol} için</dd>
                          </div>
                        </dl>
                      </div>

                      <HeroCompareChart
                        className="mt-5"
                        series={result.result.series}
                        symbolA={result.symbolA}
                        symbolB={result.symbolB}
                        amount={result.amount}
                      />

                      {(result.result.symbolA.currency !== 'TRY' ||
                        result.result.symbolB.currency !== 'TRY') && (
                        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                          <ShieldCheck
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          Yabancı para birimindeki hisse, her işlem gününün kuruyla Türk lirasına
                          çevrildi — kur hareketi de sonuca dahil.
                        </p>
                      )}
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </FadeIn>

            <div className="mt-6 text-center">
              <Button asChild>
                <Link to={isAuthenticated ? '/compare' : '/register'}>
                  Kendi Senaryonuzu Kaydedin
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────── */}
        <section id="ozellikler" className="scroll-anchor relative border-t border-border">
          <div
            className="bloom left-1/2 top-20 h-64 w-[36rem] -translate-x-1/2 bg-primary/12"
            aria-hidden="true"
          />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-16">
            <FadeIn className="mb-10 text-center">
              <p className="eyebrow text-primary">ÖZELLİKLER</p>
              <h2 className="display mt-2 text-3xl sm:text-4xl">Neler yapabilirsiniz</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                Dört temel iş, hepsi gerçek veriyle çalışıyor.
              </p>
            </FadeIn>

            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature, index) => (
                <FadeIn key={feature.title} delay={0.05 * index}>
                  <Card className="group h-full p-5 transition-all hover:border-primary/35 hover:shadow-lg sm:p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 transition-colors group-hover:bg-primary/20">
                      <feature.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </span>
                    <h3 className="display-sm mt-4 text-lg">{feature.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>

                    <ul className="mt-4 space-y-1.5">
                      {feature.points.map((point) => (
                        <li key={point} className="flex items-center gap-2 text-sm">
                          <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                          <span className="text-muted-foreground">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section id="nasil" className="scroll-anchor border-t border-border bg-surface/40">
          <div className="mx-auto w-full max-w-5xl px-4 py-16">
            <FadeIn className="mb-10 text-center">
              <p className="eyebrow text-primary">NASIL ÇALIŞIR</p>
              <h2 className="display mt-2 text-3xl sm:text-4xl">Üç adımda sonuç</h2>
            </FadeIn>

            <ol className="grid gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <FadeIn key={step.title} delay={0.06 * index}>
                  <li className="relative h-full rounded-2xl border border-border bg-card p-5">
                    <span
                      className="display absolute right-4 top-3 text-4xl text-primary/15"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <h3 className="display-sm pr-10 text-base">{step.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                  </li>
                </FadeIn>
              ))}
            </ol>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section id="sss" className="scroll-anchor border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-4 py-16">
            <FadeIn className="mb-8 text-center">
              <p className="eyebrow text-primary">SIK SORULANLAR</p>
              <h2 className="display mt-2 text-3xl sm:text-4xl">Merak edilenler</h2>
            </FadeIn>

            <dl className="space-y-3">
              {FAQ.map((item, index) => (
                <FadeIn key={item.q} delay={0.04 * index}>
                  <Card className="p-5">
                    <dt className="display-sm text-base">{item.q}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
                  </Card>
                </FadeIn>
              ))}
            </dl>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-t border-border">
          <div
            className="bloom left-1/2 top-0 h-56 w-[40rem] -translate-x-1/2 bg-secondary/20"
            aria-hidden="true"
          />

          <div className="relative mx-auto w-full max-w-3xl px-4 py-16 text-center">
            <FadeIn>
              <h2 className="display text-3xl sm:text-4xl">
                Bir sonraki “keşke”yi yaşamadan hesaplayın.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground">
                Hesap oluşturun, portföyünüzü ekleyin, senaryolarınızı kaydedin ve paylaşın.
              </p>
              <Button size="lg" className="mt-7" asChild>
                <Link to={isAuthenticated ? '/dashboard' : '/register'}>
                  {isAuthenticated ? 'Panele Git' : 'Ücretsiz Başla'}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </FadeIn>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <BrandLogo size="sm" />
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Yatırım tavsiyesi değildir. Veriler Yahoo Finance kaynaklıdır ve gecikmeli olabilir.
            Geçmiş performans gelecekteki getirinin göstergesi değildir.
          </p>
        </div>
      </footer>
    </div>
  );
}

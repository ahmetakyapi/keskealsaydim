import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  LineChart,
  GitCompare,
  LayoutDashboard,
  Menu,
  Moon,
  Share2,
  Sun,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/BrandLogo';
import { SymbolSearch } from '@/components/SymbolSearch';
import { CompareResultView } from '@/components/compare/CompareResultView';
import { FadeIn } from '@/components/Motion';
import { ErrorState } from '@/components/ui/error-state';
import { ShimmerBlock } from '@/components/ui/skeleton';
import { useDemoComparison } from '@/hooks/useQueries';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';

/**
 * The landing page runs the product, it does not mock it.
 *
 * The previous version shipped a snapshot of hand-entered prices that were
 * months old, labelled the last one "Bugünkü değer", and printed USD series
 * with a ₺ sign. Everything here comes from the same public compare endpoint
 * the app itself uses, so the number a visitor sees is the real one.
 */

const DEMO_PRESETS = [
  { label: 'THYAO / ASELS', a: 'THYAO', aName: 'Türk Hava Yolları', b: 'ASELS', bName: 'Aselsan' },
  { label: 'GARAN / BIMAS', a: 'GARAN', aName: 'Garanti BBVA', b: 'BIMAS', bName: 'BİM' },
  { label: 'EREGL / TUPRS', a: 'EREGL', aName: 'Ereğli Demir Çelik', b: 'TUPRS', bName: 'Tüpraş' },
  { label: 'THYAO / NVDA', a: 'THYAO', aName: 'Türk Hava Yolları', b: 'NVDA', bName: 'NVIDIA' },
] as const;

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
      'İki hisseyi seçtiğiniz tarih aralığında karşılaştırın. Yabancı hisseler o günün kuruyla Türk lirasına çevrilir, böylece rakamlar gerçekten kıyaslanabilir olur.',
  },
  {
    icon: Wallet,
    title: 'Portföy Takibi',
    description:
      'Aldığınız hisseleri komisyonuyla birlikte kaydedin; güncel değer, kâr/zarar, ağırlık ve satış sonrası gerçekleşen kâr tek ekranda.',
  },
  {
    icon: BellRing,
    title: 'Fiyat Alarmları',
    description:
      'Bir hisse belirlediğiniz seviyeye ulaştığında bildirim listenize düşsün. Alarm kurun, takip etmeyi bırakın.',
  },
  {
    icon: Share2,
    title: 'Paylaşılabilir Senaryolar',
    description:
      'Hesapladığınız senaryoyu kaydedin, bağlantısını paylaşın. Karşı taraf hesap açmadan sonucu görebilir.',
  },
] as const;

export default function LandingPage() {
  useDocumentTitle();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { resolvedTheme, setTheme } = useThemeStore();

  const [preset, setPreset] = useState<(typeof DEMO_PRESETS)[number]>(DEMO_PRESETS[0]);
  const [years, setYears] = useState<number>(3);
  const [symbolA, setSymbolA] = useState<string>(preset.a);
  const [symbolB, setSymbolB] = useState<string>(preset.b);
  const [menuOpen, setMenuOpen] = useState(false);

  // A query, not a mutation fired from an effect: the cache key carries the
  // inputs, so a fast range switch cannot leave a stale chart on screen and
  // revisiting a preset is instant.
  const demo = useDemoComparison(symbolA, symbolB, years);
  const result = demo.data ?? null;

  const applyPreset = (next: (typeof DEMO_PRESETS)[number]) => {
    setPreset(next);
    setSymbolA(next.a);
    setSymbolB(next.b);
  };

  return (
    <div className="min-h-dvh">
      <a
        href="#demo"
        className="sr-only-focusable fixed left-4 top-4 z-[60] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        İçeriğe atla
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" aria-label="Keşke Alsaydım ana sayfa">
            <BrandLogo size="sm" />
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Bölümler">
            <a href="#demo" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Deneyin
            </a>
            <a
              href="#ozellikler"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Özellikler
            </a>
            <a href="#sss" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Sık Sorulanlar
            </a>
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
              {[
                { href: '#demo', label: 'Deneyin' },
                { href: '#ozellikler', label: 'Özellikler' },
                { href: '#sss', label: 'Sık Sorulanlar' },
              ].map((item) => (
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

      <main>
        {/* Hero */}
        <FadeIn className="mx-auto w-full max-w-6xl px-4 pb-8 pt-12 text-center sm:pt-16">
          <Badge variant="default" className="mb-5">
            <LineChart className="h-3 w-3" aria-hidden="true" />
            Gerçek piyasa verisiyle çalışır
          </Badge>

          <h1 className="mx-auto max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            Keşke onu alsaydım demeyin.
            <span className="mt-2 block text-muted-foreground">Önce rakamı görün.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground">
            Aynı parayı başka bir hisseye koysaydınız bugün elinizde ne olurdu? Geçmiş fiyatlarla
            hesaplayın, portföyünüzü takip edin, sonucu paylaşın.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
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

          <p className="mt-4 text-xs text-muted-foreground">
            Kayıt olmadan da deneyebilirsiniz · Kredi kartı istemiyoruz
          </p>
        </FadeIn>

        {/* Live demo */}
        <section id="demo" className="scroll-anchor mx-auto w-full max-w-5xl px-4 py-10">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Canlı Deneyin</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Aşağıdaki hesap gerçek zamanlı olarak yapılır — 10.000 ₺ ile başlayan bir senaryo.
            </p>
          </div>

          <Card className="mb-4">
            <CardContent className="space-y-4 pt-5 sm:pt-6">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {DEMO_PRESETS.map((item) => (
                  <Button
                    key={item.label}
                    variant={preset.label === item.label ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => applyPreset(item)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-muted-foreground">Dönem:</span>
                {RANGES.map((range) => (
                  <Button
                    key={range.label}
                    variant={years === range.years ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setYears(range.years)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {demo.isPending ? (
            <div className="space-y-4">
              <ShimmerBlock className="h-28 w-full rounded-2xl" />
              <div className="grid gap-4 md:grid-cols-2">
                <ShimmerBlock className="h-56 w-full rounded-2xl" />
                <ShimmerBlock className="h-56 w-full rounded-2xl" />
              </div>
            </div>
          ) : demo.isError ? (
            <Card>
              <ErrorState
                error={demo.error}
                title="Örnek hesaplanamadı"
                onRetry={() => void demo.refetch()}
                retrying={demo.isFetching}
              />
            </Card>
          ) : result ? (
            <CompareResultView
              symbolA={result.symbolA}
              symbolAName={result.symbolAName}
              symbolB={result.symbolB}
              symbolBName={result.symbolBName}
              startDate={result.startDate}
              endDate={result.endDate}
              amount={result.amount}
              amountType={result.amountType}
              result={result.result}
            />
          ) : null}

          <div className="mt-6 text-center">
            <Button asChild>
              <Link to={isAuthenticated ? '/compare' : '/register'}>
                Kendi Senaryonuzu Kaydedin
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section id="ozellikler" className="scroll-anchor border-t border-border bg-surface/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-14">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold tracking-tight">Neler Yapabilirsiniz</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Dört temel iş, hepsi gerçek veriyle.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <Card key={feature.title} className="p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12">
                    <feature.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="sss" className="scroll-anchor mx-auto w-full max-w-3xl px-4 py-14">
          <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight">
            Sık Sorulan Sorular
          </h2>

          <dl className="space-y-3">
            {[
              {
                q: 'Veriler nereden geliyor?',
                a: 'Fiyat ve geçmiş veriler Yahoo Finance üzerinden alınır. Veriler 15 dakikaya kadar gecikmeli olabilir ve bilgilendirme amaçlıdır.',
              },
              {
                q: 'Yabancı hisseler nasıl hesaplanıyor?',
                a: 'ABD hisseleri dolar cinsinden işlem görür. Karşılaştırma ve portföy toplamları, her işlem gününün kuru kullanılarak Türk lirasına çevrilir; böylece kur hareketi de sonuca yansır.',
              },
              {
                q: 'Ücretli mi?',
                a: 'Hayır. Karşılaştırma, portföy takibi, izleme listesi ve fiyat alarmları ücretsizdir.',
              },
              {
                q: 'Yatırım tavsiyesi veriyor musunuz?',
                a: 'Hayır. Uygulama yalnızca geçmiş fiyatlara dayalı hesaplama yapar. Geçmiş performans gelecekteki getirinin göstergesi değildir.',
              },
            ].map((item) => (
              <Card key={item.q} className="p-5">
                <dt className="font-medium">{item.q}</dt>
                <dd className="mt-1.5 text-sm text-muted-foreground">{item.a}</dd>
              </Card>
            ))}
          </dl>
        </section>

        {/* CTA */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-4 py-14 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Bir sonraki “keşke”yi yaşamadan önce hesaplayın.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
              Hesap oluşturun, portföyünüzü ekleyin ve senaryolarınızı kaydedin.
            </p>
            <Button size="lg" className="mt-6" asChild>
              <Link to={isAuthenticated ? '/dashboard' : '/register'}>
                {isAuthenticated ? 'Panele Git' : 'Ücretsiz Başla'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <BrandLogo size="sm" />
          <p className={cn('text-xs text-muted-foreground')}>
            Yatırım tavsiyesi değildir. Veriler gecikmeli olabilir.
          </p>
        </div>
      </footer>
    </div>
  );
}

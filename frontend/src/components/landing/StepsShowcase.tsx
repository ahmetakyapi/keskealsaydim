import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  Pause,
  Play,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn, EASE_BRAND } from '@/lib/utils';
import { ComparePreview, PortfolioPreview, SharePreview } from './ProductPreviews';

/**
 * Three-step walkthrough.
 *
 * Rewritten from a sticky-scroll version that did not work: the pinned visual
 * only occupied the right column of a very tall block, so on most screens the
 * reader scrolled through a column of text with nothing visibly changing
 * beside it, and the payoff — watching the screen swap per step — was never
 * seen. Scroll-position choreography is also fragile: it depends on viewport
 * height, on how fast the reader scrolls, and on the header offset.
 *
 * This version puts the whole thing in one always-visible panel that advances
 * itself, and can be driven by hand. It behaves identically at every
 * resolution because it does not read scroll position at all.
 *
 * All four previews stay mounted in one grid cell so the panel height is set
 * by the tallest step once and never shifts when the step changes.
 */

const AUTO_ADVANCE_MS = 7000;

const STEPS = [
  {
    icon: Search,
    label: 'Adım 01',
    title: 'İki Hisse Seçin',
    description:
      'Aldığınız hisseyi ve merak ettiğiniz alternatifi yazın. Arama Türkçe yazımı da anlar — "iş bankası" yazsanız da bulur.',
    points: ['BIST ve ABD Borsaları', 'Klavyeyle Seçim', 'Sembol Doğrulama'],
    visual: <ComparePreview />,
  },
  {
    icon: BarChart3,
    label: 'Adım 02',
    title: 'Farkı Rakamla Görün',
    description:
      'Gün gün değer gelişimi, kaçırdığınız tutar ve risk göstergeleri. Yabancı hisseler o günün kuruyla Türk lirasına çevrilir.',
    points: ['Günlük Kur Çevrimi', 'Oynaklık ve Korelasyon', 'En Sert Düşüş'],
    visual: <PortfolioPreview />,
  },
  {
    icon: MousePointerClick,
    label: 'Adım 03',
    title: 'Kaydedin ve Paylaşın',
    description:
      'Senaryoyu kaydedin, bağlantısını paylaşın. Karşı taraf hesap açmadan aynı sonucu görür.',
    points: ['Genel Bağlantı', 'Görüntülenme Sayısı', 'Favorilere Ekleme'],
    visual: <SharePreview />,
  },
] as const;

export function StepsShowcase() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  // Two separate reasons to stop, kept apart on purpose. `userPaused` is a
  // deliberate choice and must survive scrolling; `inView` is incidental.
  // Conflating them meant the walkthrough paused itself before the reader ever
  // reached it and then never started.
  const [userPaused, setUserPaused] = useState(reduced);
  const [inView, setInView] = useState(false);
  const [cycle, setCycle] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const playing = !userPaused && inView && !reduced;

  const goTo = useCallback((index: number) => {
    setActive((index + STEPS.length) % STEPS.length);
    // Bump the cycle so the progress bar restarts from zero.
    setCycle((current) => current + 1);
  }, []);

  // Manual navigation should not fight the timer; pause on any interaction.
  const goToManual = useCallback(
    (index: number) => {
      setUserPaused(true);
      goTo(index);
    },
    [goTo]
  );

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => goTo(active + 1), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [playing, active, cycle, goTo]);

  // Advancing off-screen wastes the walkthrough, so it only runs while the
  // panel is actually on screen — and resumes when the reader arrives.
  useEffect(() => {
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setInView(!reduced);
      return;
    }
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.3,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  const step = STEPS[active];

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToManual(active + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToManual(active - 1);
    }
  };

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
      onMouseEnter={() => setUserPaused(true)}
    >
      {/* Stepper */}
      <div
        role="tablist"
        aria-label="Nasıl çalışır adımları"
        onKeyDown={handleKeyDown}
        className="grid border-b border-border bg-surface-raised/50 sm:grid-cols-3"
      >
        {STEPS.map((item, index) => {
          const isActive = index === active;
          const isDone = index < active;

          return (
            <button
              key={item.title}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls="steps-panel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => goToManual(index)}
              className={cn(
                'relative flex items-center gap-3 p-4 text-left transition-colors',
                'border-b border-border last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0',
                isActive ? 'bg-card' : 'hover:bg-accent/40'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isDone
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
              </span>

              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-sm font-medium transition-colors',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {item.title}
                </span>
              </span>

              {/* Timer rail: shows the auto-advance running, and how far in. */}
              {isActive && !reduced && (
                <motion.span
                  key={`${active}-${cycle}-${playing}`}
                  className="absolute bottom-0 left-0 h-0.5 bg-primary"
                  initial={{ width: playing ? '0%' : '100%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: playing ? AUTO_ADVANCE_MS / 1000 : 0, ease: 'linear' }}
                  aria-hidden="true"
                />
              )}
              {isActive && reduced && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-primary" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div
        id="steps-panel"
        role="tabpanel"
        className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2 lg:items-center lg:gap-10"
      >
        <div>
          <p className="eyebrow text-primary">{step.label.toLocaleUpperCase('tr-TR')}</p>

          {/* Keyed so the copy crossfades with the step rather than snapping. */}
          <motion.div
            key={active}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_BRAND }}
          >
            <h3 className="display-sm mt-2 text-2xl sm:text-3xl">{step.title}</h3>
            <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
              {step.description}
            </p>

            <ul className="mt-4 space-y-2">
              {step.points.map((point) => (
                <li key={point} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                  <span className="text-muted-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <div className="mt-6 flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => goToManual(active - 1)}
              aria-label="Önceki adım"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => goToManual(active + 1)}
              aria-label="Sonraki adım"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {!reduced && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUserPaused((current) => !current);
                  setCycle((current) => current + 1);
                }}
                aria-label={playing ? 'Otomatik ilerlemeyi durdur' : 'Otomatik ilerlemeyi başlat'}
              >
                {playing ? (
                  <>
                    <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                    Durdur
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    Oynat
                  </>
                )}
              </Button>
            )}

            <span className="ml-auto text-xs text-muted-foreground" data-numeric="">
              {active + 1} / {STEPS.length}
            </span>
          </div>
        </div>

        {/* All previews stacked in one cell: the height is fixed by the
            tallest step, so switching never moves the page. */}
        <div className="relative grid">
          {STEPS.map((item, index) => (
            <motion.div
              key={item.title}
              aria-hidden={index !== active}
              className={cn('col-start-1 row-start-1', index !== active && 'pointer-events-none')}
              initial={false}
              animate={{ opacity: index === active ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : 0.3, ease: EASE_BRAND }}
            >
              {item.visual}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, MousePointerClick, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn, EASE_BRAND } from '@/lib/utils';
import { ComparePreview, PortfolioPreview, SharePreview } from './ProductPreviews';

/**
 * Sticky-scroll walkthrough: the visual pins while the steps scroll past it,
 * swapping as each one becomes the active step.
 *
 * Driven by IntersectionObserver rather than a scroll listener — the observer
 * fires only at threshold crossings, so scrolling stays at 60fps instead of
 * running layout maths on every frame the way the old landing page did.
 *
 * Under `prefers-reduced-motion` the whole thing degrades to a plain stacked
 * list with each visual shown inline: no pinning, no crossfade.
 */

const STEPS = [
  {
    icon: Search,
    label: 'ADIM 01',
    title: 'İki Hisse Seçin',
    description:
      'Aldığınız hisseyi ve merak ettiğiniz alternatifi yazın. BIST ve ABD borsaları desteklenir; arama Türkçe yazımı da anlar.',
    visual: <ComparePreview />,
  },
  {
    icon: BarChart3,
    label: 'ADIM 02',
    title: 'Farkı Rakamla Görün',
    description:
      'Gün gün değer gelişimi, kaçırdığınız tutar, oynaklık ve en sert düşüş. Yabancı hisseler o günün kuruyla çevrilir.',
    visual: <PortfolioPreview />,
  },
  {
    icon: MousePointerClick,
    label: 'ADIM 03',
    title: 'Kaydedin ve Paylaşın',
    description:
      'Senaryoyu kaydedin, bağlantısını paylaşın. Karşı taraf hesap açmadan aynı sonucu görür.',
    visual: <SharePreview />,
  },
] as const;

export function StepsShowcase() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (reduced) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the middle of the viewport so the visual
        // matches whichever step the reader is actually looking at.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length === 0) return;

        const index = stepRefs.current.indexOf(visible[0].target as HTMLLIElement);
        if (index >= 0) setActive(index);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.5, 1] }
    );

    stepRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, [reduced]);

  if (reduced) {
    return (
      <ol className="space-y-10">
        {STEPS.map((step) => (
          <li key={step.title} className="grid gap-5 md:grid-cols-2 md:items-center">
            <div>
              <Badge variant="default" size="sm" className="eyebrow">
                {step.label}
              </Badge>
              <h3 className="display-sm mt-3 text-xl">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
            <div>{step.visual}</div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Steps */}
      <ol className="space-y-[34vh] py-[12vh] lg:space-y-[40vh]">
        {STEPS.map((step, index) => {
          const isActive = active === index;
          return (
            <li
              key={step.title}
              ref={(node) => {
                stepRefs.current[index] = node;
              }}
            >
              <motion.div
                animate={{ opacity: isActive ? 1 : 0.35 }}
                transition={{ duration: 0.4, ease: EASE_BRAND }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors',
                      isActive
                        ? 'border-primary/30 bg-primary/15 text-primary'
                        : 'border-border bg-muted text-muted-foreground'
                    )}
                  >
                    <step.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="eyebrow text-muted-foreground">{step.label}</span>
                </div>

                <h3 className="display-sm mt-4 text-2xl sm:text-3xl">{step.title}</h3>
                <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
                  {step.description}
                </p>

                {/* Progress rail: shows how far through the walkthrough we are. */}
                <div className="mt-5 h-0.5 w-24 overflow-hidden rounded-full bg-border">
                  <motion.div
                    className="h-full bg-primary"
                    initial={false}
                    animate={{ scaleX: isActive ? 1 : 0 }}
                    style={{ originX: 0 }}
                    transition={{ duration: 0.5, ease: EASE_BRAND }}
                  />
                </div>
              </motion.div>

              {/* Mobile: the visual travels with its own step. */}
              <div className="mt-6 lg:hidden">{step.visual}</div>
            </li>
          );
        })}
      </ol>

      {/* Pinned visual */}
      <div className="hidden lg:block">
        <div className="sticky top-[22vh]">
          <div className="relative">
            <div
              className="bloom -inset-6 h-full w-full bg-primary/15"
              aria-hidden="true"
              style={{ position: 'absolute' }}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.98 }}
                transition={{ duration: 0.38, ease: EASE_BRAND }}
                className="relative"
              >
                {STEPS[active].visual}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2" aria-hidden="true">
            {STEPS.map((step, index) => (
              <span
                key={step.title}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  active === index ? 'w-7 bg-primary' : 'w-1.5 bg-border'
                )}
              />
            ))}
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
            Kaydırarak adımları izleyin
          </p>
        </div>
      </div>
    </div>
  );
}

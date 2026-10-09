import { Link } from 'react-router-dom';
import { motion, useTransform, type MotionValue } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { RevealGroup, RevealItem } from '@/components/Motion';
import { HorizontalScroll } from '@/components/fx/HorizontalScroll';
import { SectionHeading } from '@/components/fx/SectionHeading';
import { SplitText } from '@/components/fx/SplitText';
import { useMediaQuery, usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { subtractYears, toISODate, TODAY_ISO } from '@/lib/utils';

/**
 * Prefilled entry points into the comparison screen.
 *
 * Every card is a plain link carrying its parameters in the URL — no extra
 * API calls to render this section, and the result the visitor lands on is
 * computed live rather than being a stored claim about the outcome.
 *
 * On a desktop with motion allowed, the section pins and the cards travel
 * sideways with the scroll; everywhere else it is the original grid.
 */

const PAIRS = [
  { a: 'THYAO', b: 'ASELS', label: 'Türk Hava Yolları / Aselsan', years: 3 },
  { a: 'GARAN', b: 'BIMAS', label: 'Garanti BBVA / BİM', years: 3 },
  { a: 'EREGL', b: 'TUPRS', label: 'Ereğli / Tüpraş', years: 5 },
  { a: 'THYAO', b: 'NVDA', label: 'Türk Hava Yolları / NVIDIA', years: 3 },
  { a: 'SISE', b: 'SAHOL', label: 'Şişecam / Sabancı Holding', years: 5 },
  { a: 'TCELL', b: 'TTKOM', label: 'Turkcell / Türk Telekom', years: 3 },
] as const;

type Pair = (typeof PAIRS)[number];

function hrefFor(pair: Pair): string {
  const params = new URLSearchParams({
    a: pair.a,
    b: pair.b,
    from: toISODate(subtractYears(new Date(), pair.years)),
    to: TODAY_ISO(),
    amount: '10000',
  });
  return `/compare?${params.toString()}`;
}

const TITLE = 'Sık Merak Edilen Karşılaştırmalar';
const DESCRIPTION = 'Birine tıklayın, hesap anında sizin için çalışsın.';

export function PopularComparisons() {
  const desktop = useMediaQuery('(min-width: 1024px)');
  const reduced = usePrefersReducedMotion();

  if (!desktop || reduced) {
    return (
      <section className="relative">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <SectionHeading title={TITLE} description={DESCRIPTION} />
          <PairGrid />
        </div>
      </section>
    );
  }

  return (
    <HorizontalScroll overlay={(progress) => <Rail progress={progress} />}>
      {/* Lead panel: the heading travels with the cards. */}
      <div className="flex w-[34rem] shrink-0 flex-col justify-center pr-8">
        <h2 className="display text-[clamp(2.75rem,4.6vw,4.5rem)]">
          <SplitText text={TITLE} trigger="view" />
        </h2>
        <p className="mt-5 max-w-sm text-muted-foreground">{DESCRIPTION}</p>
        <p className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
          Kaydırmaya devam edin
          <ArrowRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        </p>
      </div>

      {PAIRS.map((pair, index) => (
        <PairPanel key={`${pair.a}-${pair.b}`} pair={pair} index={index} />
      ))}
    </HorizontalScroll>
  );
}

function PairPanel({ pair, index }: { pair: Pair; index: number }) {
  return (
    <Link
      to={hrefFor(pair)}
      data-spotlight=""
      data-cursor-label="Hesapla"
      className="group flex h-[min(64vh,32rem)] w-[min(24rem,80vw)] shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-8 transition-[border-color,transform] duration-500 ease-brand hover:-translate-y-2 hover:border-primary/40"
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">{String(index + 1).padStart(2, '0')}</span>
        <span className="rounded-full border border-border px-2.5 py-1">{pair.years} yıl</span>
      </div>

      <div>
        <p className="display text-[clamp(2.75rem,4vw,4rem)] leading-none transition-transform duration-700 ease-brand group-hover:-translate-y-1">
          {pair.a}
        </p>
        <p className="my-3 text-sm text-muted-foreground">yerine</p>
        <p className="display text-[clamp(2.75rem,4vw,4rem)] leading-none text-primary transition-transform duration-700 ease-brand group-hover:translate-x-2">
          {pair.b}
        </p>
      </div>

      <div className="flex items-end justify-between gap-4">
        <span className="text-sm text-muted-foreground">{pair.label}</span>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border transition-colors duration-500 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
          <ArrowUpRight
            className="h-5 w-5 transition-transform duration-500 ease-brand group-hover:rotate-45"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}

function Rail({ progress }: { progress: MotionValue<number> }) {
  const scaleX = useTransform(progress, [0, 1], [0, 1]);
  return (
    <div className="absolute inset-x-[6vw] bottom-10 h-px bg-border" aria-hidden="true">
      <motion.div className="h-full origin-left bg-primary" style={{ scaleX }} />
    </div>
  );
}

function PairGrid() {
  return (
    <RevealGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
      {PAIRS.map((pair) => (
        <RevealItem key={`${pair.a}-${pair.b}`}>
          <Card interactive className="group h-full">
            <Link to={hrefFor(pair)} className="flex h-full items-center justify-between gap-3 p-4">
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 font-semibold">
                  {pair.a}
                  <span className="text-xs font-normal text-muted-foreground">yerine</span>
                  {pair.b}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {pair.label} · {pair.years} yıl
                </span>
              </span>

              <ArrowRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden="true"
              />
            </Link>
          </Card>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

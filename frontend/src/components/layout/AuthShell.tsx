import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { PointerAurora } from '@/components/fx/PointerAurora';
import { SplitText } from '@/components/fx/SplitText';
import { VelocityMarquee } from '@/components/fx/VelocityMarquee';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { EASE_BRAND } from '@/lib/utils';

const POINTS = [
  'Her işlem gününün kuruyla TL çevrimi',
  'Temettü ve bölünmeye göre düzeltilmiş fiyat',
  'Hesap açmadan açılan paylaşım bağlantısı',
] as const;

const TICKERS = ['THYAO', 'ASELS', 'GARAN', 'BIMAS', 'NVDA', 'EREGL', 'TUPRS', 'AAPL'] as const;

/* Decorative curve, not data. */
const LINE =
  'M0 150 C 40 140, 70 120, 110 126 S 170 90, 210 100 S 260 140, 300 112 S 360 40, 400 52 S 460 20, 520 8';

interface AuthShellProps {
  /** Split into the left panel's headline. */
  headline: string;
  children: ReactNode;
  /** Small print under the form column. */
  footnote?: ReactNode;
}

/**
 * Two-panel stage for sign-in and sign-up.
 *
 * Left (desktop only): the brand — a pointer-reactive aurora, the headline
 * rising word by word, a price line drawing itself and a slow ticker band.
 * Right: the form, whose blocks rise in one after another.
 */
export function AuthShell({ headline, children, footnote }: AuthShellProps) {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative m-3 hidden overflow-hidden rounded-[2rem] border border-border bg-surface/70 lg:flex lg:flex-col lg:justify-between">
        <PointerAurora />

        <div className="relative p-10">
          <Link to="/" aria-label="Keşke Alsaydım ana sayfa" className="inline-block">
            <BrandLogo size="md" />
          </Link>
        </div>

        <div className="relative px-10">
          <h2 className="display text-[clamp(2.5rem,4.4vw,4.25rem)]">
            <SplitText
              text={headline}
              delay={0.35}
              wordClassName={(_, index) =>
                index === headline.split(' ').length - 1 ? 'text-primary' : undefined
              }
            />
          </h2>

          <ul className="mt-8 space-y-3">
            {POINTS.map((point, index) => (
              <motion.li
                key={point}
                className="flex items-center gap-3 text-sm text-muted-foreground"
                initial={reduced ? false : { opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: EASE_BRAND, delay: 0.8 + index * 0.1 }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                {point}
              </motion.li>
            ))}
          </ul>

          <svg viewBox="0 0 520 160" className="mt-10 h-36 w-full" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="auth-line" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" style={{ stopColor: 'hsl(var(--secondary))' }} />
                <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))' }} />
              </linearGradient>
              <linearGradient id="auth-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" style={{ stopColor: 'hsl(var(--primary) / 0.25)' }} />
                <stop offset="100%" style={{ stopColor: 'hsl(var(--primary) / 0)' }} />
              </linearGradient>
            </defs>
            <motion.path
              d={`${LINE} L520 160 L0 160 Z`}
              fill="url(#auth-fill)"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.6 }}
            />
            <motion.path
              d={LINE}
              stroke="url(#auth-line)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.8, ease: [0.65, 0, 0.35, 1], delay: 0.5 }}
            />
          </svg>
        </div>

        <div className="relative border-t border-border py-4">
          <VelocityMarquee baseVelocity={-1.5}>
            {TICKERS.map((ticker) => (
              <span
                key={ticker}
                className="flex items-center gap-6 pr-6 font-mono text-sm text-muted-foreground"
              >
                {ticker}
                <span className="h-1 w-1 rounded-full bg-primary/60" />
              </span>
            ))}
          </VelocityMarquee>
        </div>
      </aside>

      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="stagger-children w-full max-w-md">
          <Link
            to="/"
            className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1"
              aria-hidden="true"
            />
            Ana sayfaya dön
          </Link>

          {children}

          {footnote && <p className="mt-6 text-center text-xs text-muted-foreground">{footnote}</p>}
        </div>
      </div>
    </div>
  );
}

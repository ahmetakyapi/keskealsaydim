import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn, formatCurrency, formatNumber, formatPercent, formatSignedCurrency } from '@/lib/utils';

type NumberFormat = 'currency' | 'signed-currency' | 'percent' | 'number';

interface AnimatedNumberProps {
  value: number;
  format?: NumberFormat;
  currency?: string;
  decimals?: number;
  durationMs?: number;
  className?: string;
  /** Hold at zero until the element scrolls into view, then count up. */
  startOnView?: boolean;
  /** Appended after the formatted number, e.g. a unit. */
  suffix?: string;
}

/**
 * Counts a figure up to its value on change.
 *
 * Written rather than pulled in because the previous `react-countup` usage
 * dropped the sign: it fed the number through a `formattingFn` and animated
 * the magnitude, so a ₺1.234 loss and a ₺1.234 gain rendered identically.
 * Here the raw value is interpolated — sign included — and formatting happens
 * once per frame on the signed number.
 *
 * Honours `prefers-reduced-motion` by jumping straight to the final value.
 */
export function AnimatedNumber({
  value,
  format = 'number',
  currency,
  decimals = 2,
  durationMs = 900,
  className,
  startOnView = false,
  suffix,
}: AnimatedNumberProps) {
  const reduced = usePrefersReducedMotion();
  const [displayed, setDisplayed] = useState(startOnView ? 0 : value);
  const [armed, setArmed] = useState(!startOnView);
  const fromRef = useRef(startOnView ? 0 : value);
  const frameRef = useRef<number>();
  const elementRef = useRef<HTMLSpanElement>(null);

  // Counting up while off-screen wastes the effect entirely; wait for the
  // figure to actually be looked at.
  useEffect(() => {
    if (!startOnView || armed || typeof IntersectionObserver === 'undefined') return;

    const node = elementRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setArmed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [startOnView, armed]);

  useEffect(() => {
    if (!armed) return;

    if (reduced) {
      setDisplayed(value);
      fromRef.current = value;
      return;
    }

    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) return;

    const start = performance.now();
    // easeOutCubic: fast settle, no overshoot past the real figure.
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setDisplayed(from + delta * ease(progress));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      fromRef.current = value;
    };
  }, [value, durationMs, reduced, armed]);

  const text = (() => {
    switch (format) {
      case 'currency':
        return formatCurrency(displayed, currency);
      case 'signed-currency':
        return formatSignedCurrency(displayed, currency);
      case 'percent':
        return formatPercent(displayed, decimals);
      default:
        return formatNumber(displayed, decimals);
    }
  })();

  return (
    <span ref={elementRef} data-numeric="" className={cn('tabular-nums', className)}>
      {text}
      {suffix}
    </span>
  );
}

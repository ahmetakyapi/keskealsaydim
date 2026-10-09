import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

const EASE_CURTAIN = [0.76, 0, 0.24, 1] as const;

/**
 * Edge-to-edge brand wordmark closing the page. Letters rise in one after
 * another as the footer comes into view, then the whole line drifts with
 * the last stretch of scroll. Splitting by code point (`Array.from`) keeps
 * "ş" and "ı" whole.
 */
export function GiantWordmark({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const y = useTransform(scrollYProgress, [0, 1], ['18%', '0%']);

  const parts = [
    { text: 'Keşke', accent: false },
    { text: 'Alsaydım', accent: true },
  ];

  if (reduced) {
    return (
      <div ref={ref} className={cn('display select-none whitespace-nowrap leading-[0.85]', className)}>
        Keşke <span className="text-primary">Alsaydım</span>
      </div>
    );
  }

  let letterIndex = 0;

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      style={{ y }}
      className={cn('display select-none whitespace-nowrap leading-[0.85]', className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      {parts.map((part, partIndex) => (
        <span key={part.text} className={cn('inline-block', part.accent && 'text-primary')}>
          {Array.from(part.text).map((letter) => {
            const delay = letterIndex++ * 0.035;
            return (
              <span key={`${letter}-${delay}`} className="inline-block overflow-hidden pb-[0.06em] align-bottom">
                <motion.span
                  className="inline-block"
                  variants={{
                    hidden: { y: '105%' },
                    visible: { y: '0%', transition: { duration: 0.9, ease: EASE_CURTAIN, delay } },
                  }}
                >
                  {letter}
                </motion.span>
              </span>
            );
          })}
          {partIndex === 0 && <span className="inline-block w-[0.25em]" />}
        </span>
      ))}
    </motion.div>
  );
}

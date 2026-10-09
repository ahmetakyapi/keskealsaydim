import { motion, type Variants } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn, EASE_BRAND } from '@/lib/utils';

interface SplitTextProps {
  text: string;
  className?: string;
  /** Applied to each word's inner span, e.g. to colour one line. */
  wordClassName?: string | ((word: string, index: number) => string | undefined);
  delay?: number;
  stagger?: number;
  /** `mount` plays immediately, `view` waits until the line scrolls in. */
  trigger?: 'mount' | 'view';
  /** Holds the reveal until true — the hero waits for the preloader. */
  play?: boolean;
}

const container = (stagger: number, delay: number): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

const word: Variants = {
  hidden: { y: '115%', rotate: 6 },
  visible: { y: '0%', rotate: 0, transition: { duration: 0.95, ease: EASE_BRAND } },
};

/**
 * Masked word-by-word headline reveal.
 *
 * Splits on spaces only — never on letters — so Turkish words keep their
 * shaping and nothing passes through a casing transform. The visible copy is
 * `aria-hidden`; a screen reader gets the sentence once, intact, from the
 * `sr-only` twin instead of one word per element.
 */
export function SplitText({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.07,
  trigger = 'mount',
  play = true,
}: SplitTextProps) {
  const reduced = usePrefersReducedMotion();
  const words = text.split(' ');
  const classFor = (item: string, index: number) =>
    typeof wordClassName === 'function' ? wordClassName(item, index) : wordClassName;

  // Static, but keeps per-word styling (e.g. the accent-coloured word).
  if (reduced) {
    return (
      <span className={className}>
        {words.map((item, index) => (
          <span key={`${item}-${index}`}>
            <span className={classFor(item, index)}>{item}</span>
            {index < words.length - 1 && ' '}
          </span>
        ))}
      </span>
    );
  }

  const playProps =
    trigger === 'view'
      ? { whileInView: play ? 'visible' : undefined, viewport: { once: true, amount: 0.5 } }
      : { animate: play ? 'visible' : 'hidden' };

  return (
    <>
      <span className="sr-only">{text}</span>
      <motion.span
        aria-hidden="true"
        className={cn('inline', className)}
        variants={container(stagger, delay)}
        initial="hidden"
        {...playProps}
      >
        {words.map((item, index) => (
          <span key={`${item}-${index}`}>
            {/* Padding + negative margin keep descenders (ş, ğ, ç) inside the mask. */}
            <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
              <motion.span
                variants={word}
                className={cn('inline-block origin-bottom-left will-change-transform', classFor(item, index))}
              >
                {item}
              </motion.span>
            </span>
            {index < words.length - 1 && ' '}
          </span>
        ))}
      </motion.span>
    </>
  );
}

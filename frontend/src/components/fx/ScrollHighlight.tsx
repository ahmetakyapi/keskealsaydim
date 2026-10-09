import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

interface ScrollHighlightProps {
  text: string;
  className?: string;
  /** Words (exact, punctuation included) to tint with the brand colour. */
  highlight?: readonly string[];
}

/**
 * A paragraph that lights up word by word as it scrolls through the
 * viewport — the reading pace is set by the reader's own scroll.
 */
export function ScrollHighlight({ text, className, highlight = [] }: ScrollHighlightProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] });

  const words = text.split(' ');

  if (reduced) {
    return (
      <p ref={ref} className={className}>
        {text}
      </p>
    );
  }

  return (
    <p ref={ref} className={cn('relative', className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((item, index) => (
          <Word
            key={`${item}-${index}`}
            progress={scrollYProgress}
            range={[index / words.length, (index + 1) / words.length]}
            accent={highlight.includes(item)}
          >
            {item}
          </Word>
        ))}
      </span>
    </p>
  );
}

function Word({
  children,
  progress,
  range,
  accent,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  accent: boolean;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  const y = useTransform(progress, range, [6, 0]);

  return (
    <>
      <motion.span style={{ opacity, y }} className={cn('inline-block', accent && 'text-primary')}>
        {children}
      </motion.span>{' '}
    </>
  );
}

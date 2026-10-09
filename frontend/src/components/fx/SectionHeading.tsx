import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn, EASE_BRAND } from '@/lib/utils';
import { SplitText } from './SplitText';

interface SectionHeadingProps {
  title: string;
  description?: string;
  align?: 'center' | 'left';
  className?: string;
}

/**
 * Section opener: the title rising in word by word as it scrolls into view.
 * No kicker line above it — the owner asked for those to go (unreadable).
 */
export function SectionHeading({
  title,
  description,
  align = 'center',
  className,
}: SectionHeadingProps) {
  const reduced = usePrefersReducedMotion();
  const centered = align === 'center';

  return (
    <div className={cn(centered ? 'text-center' : 'text-left', 'mb-10', className)}>
      <h2 className="display text-[clamp(2rem,4.2vw,3.5rem)]">
        <SplitText text={title} trigger="view" />
      </h2>
      {description && (
        <motion.p
          className={cn('mt-4 max-w-xl text-sm text-muted-foreground sm:text-base', centered && 'mx-auto')}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.7, ease: EASE_BRAND, delay: 0.25 }}
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}

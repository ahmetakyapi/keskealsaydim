import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useIsFetching } from '@tanstack/react-query';
import { useMotionStore } from '@/stores/motionStore';

/**
 * Thin progress bar along the top edge while something is loading for the
 * first time: a lazy route chunk, or a query that has no data yet.
 *
 * Background refetches of data already on screen are deliberately excluded —
 * a bar that twitches every 30 seconds on the market page is noise, not
 * information.
 */
export function TopLoader() {
  const fetching = useIsFetching({ predicate: (query) => query.state.data === undefined });
  const pending = useMotionStore((state) => state.pending);
  const active = fetching + pending > 0;

  const progress = useMotionValue(0);
  const opacity = useMotionValue(0);
  const scaleX = useTransform(progress, (value) => value / 100);

  useEffect(() => {
    if (active) {
      opacity.set(1);
      if (progress.get() >= 100) progress.set(0);
      // Asymptotic crawl: fast at first, never claiming to be finished.
      const controls = animate(progress, 88, { duration: 6, ease: [0.1, 0.8, 0.3, 1] });
      return () => controls.stop();
    }

    if (progress.get() === 0) return;
    const controls = animate(progress, 100, {
      duration: 0.3,
      ease: 'easeOut',
      onComplete: () => {
        animate(opacity, 0, { duration: 0.35 }).then(() => progress.set(0));
      },
    });
    return () => controls.stop();
  }, [active, progress, opacity]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[96] h-0.5"
      style={{ opacity }}
    >
      <motion.div
        className="h-full origin-left bg-gradient-to-r from-secondary via-primary to-primary shadow-[0_0_12px_hsl(var(--primary)/0.7)]"
        style={{ scaleX }}
      />
    </motion.div>
  );
}

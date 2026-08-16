import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { EASE_BRAND } from '@/lib/utils';

/**
 * Motion primitives.
 *
 * Deliberately small: the previous build ran ~17 infinite ambient animations
 * with no reduced-motion escape hatch, which is both a distraction on a page
 * full of numbers and an accessibility problem. Motion here is one-shot,
 * entrance-only, on the house curve, and disabled outright when the visitor
 * has asked the OS to reduce motion.
 */

const DURATION = 0.32;

interface MotionWrapperProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Vertical travel distance in pixels. */
  y?: number;
}

export function FadeIn({ children, className, delay = 0, y = 8 }: MotionWrapperProps) {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, ease: EASE_BRAND, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Wraps routed page content so navigating between screens reads as a change
 * of place rather than a repaint. Keyed by pathname at the call site.
 */
export function PageTransition({ children, className }: MotionWrapperProps) {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, ease: EASE_BRAND }}
    >
      {children}
    </motion.div>
  );
}

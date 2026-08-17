import type { ReactNode } from 'react';
import { motion, useScroll, useSpring, type Variants } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { EASE_BRAND } from '@/lib/utils';

/**
 * Motion primitives.
 *
 * Every one of these is entrance- or scroll-driven and one-shot. The rule the
 * old build broke was running ~17 infinite ambient animations with no
 * reduced-motion escape hatch — on a page full of numbers that is both a
 * distraction and an accessibility problem. Here, when the visitor has asked
 * the OS to reduce motion, each component renders its children plainly.
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

  if (reduced) return <div className={className}>{children}</div>;

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

  if (reduced) return <div className={className}>{children}</div>;

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

interface RevealProps extends MotionWrapperProps {
  /** Slide direction the element travels from. */
  from?: 'bottom' | 'left' | 'right' | 'none';
  /** Fraction of the element that must be visible before it plays. */
  amount?: number;
  as?: 'div' | 'section' | 'li' | 'article';
}

const OFFSET = {
  bottom: { x: 0, y: 26 },
  left: { x: -26, y: 0 },
  right: { x: 26, y: 0 },
  none: { x: 0, y: 0 },
} as const;

/**
 * Plays once when the element scrolls into view. `once: true` matters: a
 * section that re-animates every time it re-enters the viewport turns a
 * scroll back up into a flicker show.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  from = 'bottom',
  amount = 0.25,
  as = 'div',
}: RevealProps) {
  const reduced = usePrefersReducedMotion();
  const Component = motion[as];

  if (reduced) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Component
      className={className}
      initial={{ opacity: 0, ...OFFSET[from] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.55, ease: EASE_BRAND, delay }}
    >
      {children}
    </Component>
  );
}

/** Container that staggers its `RevealItem` children as the group enters view. */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  amount = 0.2,
}: MotionWrapperProps & { stagger?: number; amount?: number }) {
  const reduced = usePrefersReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  const variants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger } },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_BRAND } },
};

export function RevealItem({ children, className }: MotionWrapperProps) {
  const reduced = usePrefersReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

/**
 * Reading-progress bar pinned under the header. Spring-smoothed so it glides
 * rather than snapping frame to frame.
 */
export function ScrollProgress() {
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  if (reduced) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-primary to-secondary"
    />
  );
}

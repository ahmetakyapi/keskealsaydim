import { useRef, type ReactNode } from 'react';
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { wrap } from '@/lib/motion';


interface VelocityMarqueeProps {
  children: ReactNode;
  /** Percent of one copy's width per second; the sign sets direction. */
  baseVelocity?: number;
  className?: string;
}

/**
 * A marquee that answers the scroll wheel: it drifts on its own, speeds up
 * with scroll speed, reverses when the reader scrolls back up, and leans
 * into the motion with a slight skew.
 *
 * Stops computing entirely while off-screen, and renders a single static
 * row under reduced motion.
 */
export function VelocityMarquee({ children, baseVelocity = 3, className }: VelocityMarqueeProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '120px' });

  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 4], { clamp: false });
  const skewX = useTransform(smoothVelocity, [-2500, 0, 2500], [7, 0, -7]);
  const x = useTransform(baseX, (value) => `${wrap(-50, -25, value)}%`);
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduced || !inView) return;
    let moveBy = direction.current * baseVelocity * (delta / 1000);
    const factor = velocityFactor.get();
    if (factor < 0) direction.current = -1;
    else if (factor > 0) direction.current = 1;
    moveBy += direction.current * moveBy * factor;
    baseX.set(baseX.get() + moveBy);
  });

  if (reduced) {
    return (
      <div ref={ref} className={cn('flex overflow-hidden whitespace-nowrap', className)}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} aria-hidden="true" className={cn('overflow-hidden whitespace-nowrap', className)}>
      <motion.div className="flex w-max flex-nowrap" style={{ x, skewX }}>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex shrink-0 flex-nowrap">
            {children}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

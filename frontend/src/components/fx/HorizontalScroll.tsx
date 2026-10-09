import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
  /** Rendered inside the pinned viewport, e.g. a progress rail. */
  overlay?: (progress: ReturnType<typeof useScroll>['scrollYProgress']) => ReactNode;
}

/**
 * Pins a full-screen stage and converts vertical scroll into horizontal
 * travel of the track inside it. The section's height is exactly the
 * track's overflow plus one screen, so the pin releases the moment the last
 * card is fully in view — no dead scroll at the end.
 *
 * Callers decide when to use it (desktop, motion allowed) and render a
 * plain grid otherwise; pinning on a phone fights the thumb.
 */
export function HorizontalScroll({ children, className, overlay }: HorizontalScrollProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => setDistance(Math.max(0, track.scrollWidth - window.innerWidth));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(track);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  return (
    <section ref={sectionRef} className={cn('relative', className)} style={{ height: `calc(100vh + ${distance}px)` }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <motion.div ref={trackRef} style={{ x }} className="flex w-max items-stretch gap-6 px-[6vw]">
          {children}
        </motion.div>
        {overlay?.(scrollYProgress)}
      </div>
    </section>
  );
}

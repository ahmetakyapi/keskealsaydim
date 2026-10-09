import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useFinePointer, usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

/**
 * Soft colour fields that drift toward the pointer at different speeds,
 * giving a section depth without a single looping animation. Absolutely
 * positioned: drop it into any `relative overflow-hidden` container.
 */
export function PointerAurora({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduced = usePrefersReducedMotion();

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 40, damping: 18 });
  const sy = useSpring(py, { stiffness: 40, damping: 18 });

  const ax = useTransform(sx, (value) => value * 0.12);
  const ay = useTransform(sy, (value) => value * 0.12);
  const bx = useTransform(sx, (value) => value * -0.08);
  const by = useTransform(sy, (value) => value * -0.08);
  const cx = useTransform(sx, (value) => value * 0.22);
  const cy = useTransform(sy, (value) => value * 0.22);

  useEffect(() => {
    if (!fine || reduced) return;

    // Window-level so content stacked above the aurora doesn't swallow the
    // events; positions are taken relative to the aurora's own box.
    function handleMove(event: PointerEvent) {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) return;
      px.set(event.clientX - rect.left - rect.width / 2);
      py.set(event.clientY - rect.top - rect.height / 2);
    }

    window.addEventListener('pointermove', handleMove, { passive: true });
    return () => window.removeEventListener('pointermove', handleMove);
  }, [fine, reduced, px, py]);

  return (
    <div ref={ref} aria-hidden="true" className={cn('pointer-events-none absolute inset-0', className)}>
      <motion.div style={{ x: ax, y: ay }} className="bloom -top-24 left-[6%] h-[26rem] w-[26rem] bg-primary/30" />
      <motion.div style={{ x: bx, y: by }} className="bloom -top-10 right-[4%] h-[30rem] w-[30rem] bg-secondary/25" />
      <motion.div style={{ x: cx, y: cy }} className="bloom bottom-0 left-1/3 h-56 w-[32rem] bg-primary/12" />
    </div>
  );
}

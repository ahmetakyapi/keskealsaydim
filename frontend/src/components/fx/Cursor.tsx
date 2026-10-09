import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import { useFinePointer, usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

type CursorMode = 'default' | 'hover' | 'text' | 'hidden';

const INTERACTIVE = 'a, button, [role="button"], [role="tab"], summary, label, [data-cursor]';
const TEXT_ENTRY = 'input, textarea, select, [contenteditable="true"]';

/**
 * A trailing ring that follows the pointer, grows over anything clickable and
 * can carry a short label (`data-cursor-label="Hesapla"`).
 *
 * The native cursor stays visible: this is a companion, not a replacement.
 * Hiding the system cursor on a page with inputs and charts trades usability
 * for a look, and this app is a tool first. Mouse-only; reduced motion off.
 */
export function CursorFollower() {
  const fine = useFinePointer();
  const reduced = usePrefersReducedMotion();
  const enabled = fine && !reduced;

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 380, damping: 32, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 380, damping: 32, mass: 0.5 });

  const [mode, setMode] = useState<CursorMode>('hidden');
  const [label, setLabel] = useState<string | null>(null);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    function handleMove(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return;
      x.set(event.clientX);
      y.set(event.clientY);

      const target = event.target as Element | null;
      if (!target || !(target instanceof Element)) return;

      if (target.closest(TEXT_ENTRY)) {
        setMode('text');
        setLabel(null);
        return;
      }

      const interactive = target.closest(INTERACTIVE);
      if (interactive) {
        setMode('hover');
        setLabel(interactive.getAttribute('data-cursor-label'));
      } else {
        setMode('default');
        setLabel(null);
      }
    }

    const handleLeave = () => setMode('hidden');
    const handleDown = () => setPressed(true);
    const handleUp = () => setPressed(false);

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerdown', handleDown, { passive: true });
    window.addEventListener('pointerup', handleUp, { passive: true });
    document.documentElement.addEventListener('mouseleave', handleLeave);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
      document.documentElement.removeEventListener('mouseleave', handleLeave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const size = label ? 84 : mode === 'hover' ? 56 : 30;
  const visible = mode !== 'hidden' && mode !== 'text';

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[95]">
      <motion.div
        className="absolute left-0 top-0"
        style={{ x: ringX, y: ringY }}
      >
        <motion.div
          className={cn(
            'flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border',
            label
              ? 'border-primary bg-primary text-primary-foreground'
              : mode === 'hover'
                ? 'border-primary/70 bg-primary/10'
                : 'border-foreground/35'
          )}
          animate={{
            width: size,
            height: size,
            opacity: visible ? 1 : 0,
            scale: pressed ? 0.82 : 1,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          <AnimatePresence>
            {label && (
              <motion.span
                key={label}
                className="text-[11px] font-semibold"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <motion.div className="absolute left-0 top-0" style={{ x, y }}>
        <motion.div
          className="h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
          animate={{ opacity: visible && !label ? 1 : 0 }}
        />
      </motion.div>
    </div>
  );
}

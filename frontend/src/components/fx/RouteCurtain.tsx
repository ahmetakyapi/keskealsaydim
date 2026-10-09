import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

const COLUMNS = 5;
const EASE_CURTAIN = [0.76, 0, 0.24, 1] as const;

/**
 * Staggered column wipe between "worlds" (landing ↔ auth ↔ app).
 *
 * Lives inside each route element under an `AnimatePresence mode="wait"`:
 * when a world leaves, its columns rise from the bottom to cover the screen;
 * the incoming world mounts with its columns already closed and lifts them
 * off the top. Because the outgoing cover and the incoming reveal are both
 * full-screen at the hand-off, the swap underneath is never visible.
 *
 * Navigation inside the app shell keeps one key, so it never replays this —
 * moving from Panel to Portföy should feel instant, not theatrical.
 */
export function RouteCurtain({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();

  return (
    <>
      {children}
      {!reduced && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] flex">
          {Array.from({ length: COLUMNS }, (_, index) => {
            // Outward-in stagger: the middle column leads.
            const order = Math.abs(index - (COLUMNS - 1) / 2);
            return (
              <motion.div
                key={index}
                className="-mx-px h-full flex-1 bg-primary"
                initial={{ scaleY: 1, originY: 0 }}
                animate={{
                  scaleY: 0,
                  transition: { duration: 0.6, ease: EASE_CURTAIN, delay: 0.05 + order * 0.06 },
                }}
                exit={{
                  scaleY: 1,
                  originY: 1,
                  transition: {
                    scaleY: { duration: 0.5, ease: EASE_CURTAIN, delay: order * 0.05 },
                    originY: { duration: 0 },
                  },
                }}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

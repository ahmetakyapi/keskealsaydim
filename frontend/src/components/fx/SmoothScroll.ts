import { useEffect } from 'react';
import Lenis from 'lenis';
import { useMotionStore } from '@/stores/motionStore';

let instance: Lenis | null = null;

/** The active Lenis instance, if a page has turned smooth scrolling on. */
export function getLenis(): Lenis | null {
  return instance;
}

/**
 * Inertial smooth scrolling for the marketing pages.
 *
 * Scoped to the pages that call it rather than the whole app: the app shell
 * has drawers, dialogs and scrollable tables that each lock or own scroll,
 * and every one of those would need to opt out. Lenis drives the native
 * scroll position, so Framer Motion's `useScroll`, sticky positioning and
 * anchors keep working unchanged. Off under reduced motion; touch keeps the
 * platform's own scrolling.
 */
export function useSmoothScroll() {
  const introDone = useMotionStore((state) => state.introDone);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      wheelMultiplier: 1,
      allowNestedScroll: true,
      anchors: { offset: -72 },
    });
    instance = lenis;

    return () => {
      lenis.destroy();
      if (instance === lenis) instance = null;
    };
  }, []);

  useEffect(() => {
    if (!instance) return;
    if (introDone) instance.start();
    else instance.stop();
  }, [introDone]);
}

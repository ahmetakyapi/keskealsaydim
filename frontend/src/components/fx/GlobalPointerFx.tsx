import { useEffect } from 'react';

/**
 * One delegated listener that feeds the pointer position into whichever
 * `[data-spotlight]` surface it is over, as `--mx` / `--my`. The glow itself
 * is pure CSS (see `index.css`), so a page full of cards costs one listener,
 * not one per card.
 */
export function GlobalPointerFx() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let frame = 0;
    let lastEvent: PointerEvent | null = null;

    function apply() {
      frame = 0;
      const event = lastEvent;
      if (!event || !(event.target instanceof Element)) return;
      const surface = event.target.closest<HTMLElement>('[data-spotlight]');
      if (!surface) return;
      const rect = surface.getBoundingClientRect();
      surface.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      surface.style.setProperty('--my', `${event.clientY - rect.top}px`);
    }

    function handleMove(event: PointerEvent) {
      lastEvent = event;
      if (!frame) frame = requestAnimationFrame(apply);
    }

    window.addEventListener('pointermove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handleMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}

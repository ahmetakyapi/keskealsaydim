import { create } from 'zustand';

/**
 * Cross-cutting motion state that more than one tree needs to agree on.
 *
 * - `introDone`: the first-visit preloader has lifted. The hero holds its
 *   headline reveal until then, otherwise it would play underneath the
 *   preloader where nobody can see it.
 * - `pending`: number of route chunks currently suspended. Drives the top
 *   loading bar together with React Query's own fetch count.
 */

const INTRO_KEY = 'ka-intro-seen';

function shouldPlayIntro(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    // Only the landing page earns an intro; deep links into the app should
    // never wait behind a brand moment.
    if (window.location.pathname !== '/') return false;
    return window.sessionStorage.getItem(INTRO_KEY) !== '1';
  } catch {
    return false;
  }
}

interface MotionState {
  introDone: boolean;
  playIntro: boolean;
  finishIntro: () => void;
  pending: number;
  beginPending: () => void;
  endPending: () => void;
}

const playIntro = shouldPlayIntro();

export const useMotionStore = create<MotionState>()((set) => ({
  introDone: !playIntro,
  playIntro,
  finishIntro: () => {
    try {
      window.sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* private mode: the intro simply plays again next visit */
    }
    set({ introDone: true, playIntro: false });
  },
  pending: 0,
  beginPending: () => set((state) => ({ pending: state.pending + 1 })),
  endPending: () => set((state) => ({ pending: Math.max(0, state.pending - 1) })),
}));

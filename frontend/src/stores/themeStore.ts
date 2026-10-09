import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme): ResolvedTheme {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }

  return resolvedTheme;
}

/*
 * Where the last click landed, so a theme switch can grow out of the button
 * that triggered it. Captured globally because Radix menu items hand
 * `onSelect` an event without coordinates.
 */
let lastPointer: { x: number; y: number } | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (event) => {
      lastPointer = { x: event.clientX, y: event.clientY };
    },
    { passive: true, capture: true }
  );
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

/**
 * Runs `commit` inside a View Transition that reveals the new theme as an
 * expanding circle from the last click. Falls back to an instant switch
 * where the API is missing or the visitor prefers reduced motion.
 */
function withThemeTransition(commit: () => void) {
  const doc = typeof document === 'undefined' ? null : (document as ViewTransitionDocument);
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!doc?.startViewTransition || reduced) {
    commit();
    return;
  }

  const x = lastPointer?.x ?? window.innerWidth / 2;
  const y = lastPointer?.y ?? window.innerHeight / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const transition = doc.startViewTransition(commit);
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 700,
          easing: 'cubic-bezier(0.76, 0, 0.24, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    })
    .catch(() => {
      /* transition skipped (e.g. tab hidden); the theme is already applied */
    });
}

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  syncTheme: () => void;
  /**
   * Adopts the theme stored on the user's account, without overwriting a
   * choice the visitor made in this browser more recently.
   */
  hydrateFromProfile: (theme: string | undefined) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      resolvedTheme: 'dark',

      setTheme: (theme) => {
        const commit = () => set({ theme, resolvedTheme: applyTheme(theme) });
        const next = theme === 'system' ? getSystemTheme() : theme;
        // Same colours either way (e.g. dark → system-on-dark): nothing to animate.
        if (next === get().resolvedTheme) commit();
        else withThemeTransition(commit);
      },

      syncTheme: () => {
        set((state) => ({ resolvedTheme: applyTheme(state.theme) }));
      },

      hydrateFromProfile: (theme) => {
        if (theme !== 'dark' && theme !== 'light' && theme !== 'system') return;
        if (get().theme === theme) return;
        set({ theme, resolvedTheme: applyTheme(theme) });
      },
    }),
    {
      name: 'yoa-theme',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        // The inline script in index.html already painted the right class;
        // this keeps the store's resolvedTheme in agreement with it.
        state?.syncTheme();
      },
    }
  )
);

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
        set({ theme, resolvedTheme: applyTheme(theme) });
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

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
  }

  return resolvedTheme;
}

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  syncTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      resolvedTheme: 'dark',
      setTheme: (theme) => {
        set({
          theme,
          resolvedTheme: applyTheme(theme),
        });
      },
      syncTheme: () =>
        set((state) => ({
          resolvedTheme: applyTheme(state.theme),
        })),
    }),
    {
      name: 'yoa-theme',
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);

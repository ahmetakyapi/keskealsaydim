import { Toaster as Sonner } from 'sonner';
import { useThemeStore } from '@/stores/themeStore';

export function Toaster() {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  return (
    <Sonner
      theme={resolvedTheme}
      position="top-right"
      toastOptions={{
        style: {
          background: isDark ? 'hsl(240 10% 7%)' : 'hsl(0 0% 100%)',
          border: isDark ? '1px solid hsl(240 10% 15%)' : '1px solid hsl(210 20% 88%)',
          color: isDark ? 'hsl(240 10% 97%)' : 'hsl(222 47% 11%)',
        },
      }}
    />
  );
}

import { Toaster as Sonner } from 'sonner';
import { useThemeStore } from '@/stores/themeStore';

export function Toaster() {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

  return (
    <Sonner
      theme={resolvedTheme}
      position="top-right"
      closeButton
      richColors={false}
      toastOptions={{
        // Driven by the same tokens as the rest of the app so toasts follow
        // the theme instead of carrying their own hard-coded palette.
        classNames: {
          toast:
            'group border border-border bg-popover text-popover-foreground shadow-xl rounded-xl',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
          error: 'border-danger/30',
          success: 'border-success/30',
        },
      }}
    />
  );
}

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      toastOptions={{
        style: {
          background: 'hsl(240 10% 7%)',
          border: '1px solid hsl(240 10% 15%)',
          color: 'hsl(240 10% 97%)',
        },
      }}
    />
  );
}

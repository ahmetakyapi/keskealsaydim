import { Link, useLocation } from 'react-router-dom';
import { Compass, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuthStore } from '@/stores/authStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * A real 404. The router used to bounce every unknown path to `/`, which made
 * a mistyped or dead share link look like a redirect rather than an error.
 */
export default function NotFoundPage() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  useDocumentTitle('Sayfa Bulunamadı');

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <Link to="/" className="mb-10">
        <BrandLogo size="md" />
      </Link>

      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        Bu sayfayı bulamadık
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        <span className="break-all font-mono text-xs text-foreground/70">{location.pathname}</span>{' '}
        adresi taşınmış, silinmiş ya da hiç var olmamış olabilir.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link to={isAuthenticated ? '/dashboard' : '/'}>
            <Home className="h-4 w-4" aria-hidden="true" />
            {isAuthenticated ? 'Panele Dön' : 'Ana Sayfaya Dön'}
          </Link>
        </Button>

        {isAuthenticated ? (
          <Button variant="outline" asChild>
            <Link to="/compare">
              <Compass className="h-4 w-4" aria-hidden="true" />
              Karşılaştırma Yap
            </Link>
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link to="/login">
              <Search className="h-4 w-4" aria-hidden="true" />
              Giriş Yap
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

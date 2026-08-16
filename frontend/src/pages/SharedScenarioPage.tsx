import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Eye, LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/error-state';
import { PageLoadingState } from '@/components/ui/skeleton';
import { BrandLogo } from '@/components/BrandLogo';
import { CompareResultView } from '@/components/compare/CompareResultView';
import { useSharedScenario } from '@/hooks/useQueries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/lib/utils';

/**
 * The public view of a shared comparison.
 *
 * This route is deliberately outside the auth guard: the backend serves share
 * tokens without a session, but the frontend had no route for them at all, so
 * every link the app generated bounced the recipient to the login screen and
 * dropped the token.
 */
export default function SharedScenarioPage() {
  const { token } = useParams<{ token: string }>();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data, isLoading, isError, error, refetch, isFetching } = useSharedScenario(token);

  useDocumentTitle(
    data ? `${data.symbolA} - ${data.symbolB} Karşılaştırması` : 'Paylaşılan Karşılaştırma'
  );

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <Link to="/" aria-label="Ana sayfaya git">
            <BrandLogo size="sm" />
          </Link>

          <Button size="sm" asChild>
            <Link to={isAuthenticated ? '/compare' : '/register'}>
              {isAuthenticated ? 'Kendi Karşılaştırmanı Yap' : 'Ücretsiz Dene'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
        {isLoading ? (
          <PageLoadingState message="Karşılaştırma yükleniyor…" />
        ) : isError ? (
          <Card>
            <ErrorState
              error={error}
              title="Bu karşılaştırma bulunamadı"
              onRetry={() => void refetch()}
              retrying={isFetching}
            />
            <div className="flex justify-center pb-8">
              <Button variant="outline" asChild>
                <Link to="/">Ana Sayfaya Dön</Link>
              </Button>
            </div>
          </Card>
        ) : data ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Paylaşılan karşılaştırma
                </p>
                <h1 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">
                  {data.title || `${data.symbolA} - ${data.symbolB}`}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(data.createdAt)} tarihinde oluşturuldu
                </p>
              </div>

              <Badge variant="neutral">
                <Eye className="h-3 w-3" aria-hidden="true" />
                {data.viewCount} görüntülenme
              </Badge>
            </div>

            <CompareResultView
              symbolA={data.symbolA}
              symbolAName={data.symbolAName}
              symbolB={data.symbolB}
              symbolBName={data.symbolBName}
              startDate={data.startDate}
              endDate={data.endDate ?? data.startDate}
              amount={data.amount}
              amountType={data.amountType}
              result={data.result}
            />

            <Card className="flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Kendi senaryolarınızı oluşturun, portföyünüzü takip edin.
              </p>
              <Button asChild>
                <Link to={isAuthenticated ? '/compare' : '/register'}>
                  {isAuthenticated ? 'Karşılaştırma Yap' : 'Ücretsiz Hesap Oluştur'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}

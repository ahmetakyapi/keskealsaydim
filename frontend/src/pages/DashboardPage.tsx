import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  ArrowRight,
  ArrowUpDown,
  BellRing,
  Circle,
  GitCompare,
  Plus,
  RefreshCw,
  Star,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { ShimmerCard, ShimmerStats, ShimmerTable } from '@/components/ui/skeleton';
import { ChangeBadge, Money, Percent, UnavailableValue } from '@/components/ui/value';
import {
  useAlerts,
  useCompareHistory,
  useMarketOverview,
  usePortfolio,
  useUserProfile,
  useWatchlist,
} from '@/hooks/useQueries';
import { useChartPalette } from '@/hooks/useChartPalette';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { cn, formatCurrency, formatDate, formatNumber, formatRelativeTime } from '@/lib/utils';

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 6) return 'İyi geceler';
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export default function DashboardPage() {
  useDocumentTitle('Panel');
  const navigate = useNavigate();
  const palette = useChartPalette();
  const now = useNow(60_000);

  const portfolio = usePortfolio();
  const market = useMarketOverview();
  const watchlist = useWatchlist();
  const alerts = useAlerts();
  const scenarios = useCompareHistory(0, 3);
  const { data: profile } = useUserProfile();

  const valuesHidden = profile?.settings ? !profile.settings.showPortfolioValue : false;

  const summary = portfolio.data;
  const holdings = useMemo(() => summary?.holdings ?? [], [summary]);

  // Each section reports its own state. Combining the two queries' loading
  // flags with && meant a cached market response could unmask the portfolio
  // section while it was still fetching, showing "veri yok" over real data.
  const portfolioEmpty = portfolio.isSuccess && holdings.length === 0;

  const topMovers = useMemo(() => {
    const priced = (watchlist.data ?? []).filter((item) => item.priceAvailable);
    return [...priced].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 5);
  }, [watchlist.data]);

  const bestHolding = useMemo(() => {
    const priced = holdings.filter((holding) => !holding.stale);
    if (priced.length === 0) return null;
    return priced.reduce((best, current) =>
      current.profitPercent > best.profitPercent ? current : best
    );
  }, [holdings]);

  const worstHolding = useMemo(() => {
    const priced = holdings.filter((holding) => !holding.stale);
    if (priced.length < 2) return null;
    return priced.reduce((worst, current) =>
      current.profitPercent < worst.profitPercent ? current : worst
    );
  }, [holdings]);

  const allocation = useMemo(() => {
    const bySymbol = new Map<string, number>();
    for (const holding of holdings) {
      bySymbol.set(holding.symbol, (bySymbol.get(holding.symbol) ?? 0) + holding.currentValue);
    }
    return [...bySymbol.entries()]
      .map(([symbol, value]) => ({ symbol, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [holdings]);

  const indices = (market.data?.quotes ?? []).filter((quote) => quote.category === 'INDEX');
  const currencies = (market.data?.quotes ?? []).filter((quote) => quote.category === 'CURRENCY');
  const activeAlerts = (alerts.data?.content ?? []).filter((alert) => alert.status === 'ACTIVE');
  const marketState = market.data?.marketState ?? 'UNKNOWN';

  const refreshAll = () => {
    void portfolio.refetch();
    void market.refetch();
    void watchlist.refetch();
    void alerts.refetch();
  };

  const anyFetching =
    portfolio.isFetching || market.isFetching || watchlist.isFetching || alerts.isFetching;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${greetingFor(now)}${profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}`}
        description="Portföyünüz, izlediğiniz hisseler ve piyasanın bugünkü durumu."
        meta={
          market.data && (
            <>
              <Badge variant={marketState === 'OPEN' ? 'success' : 'neutral'} size="sm">
                <Circle
                  className={cn('h-2 w-2 fill-current', marketState === 'OPEN' && 'animate-pulse')}
                  aria-hidden="true"
                />
                {marketState === 'OPEN' ? 'BIST açık' : 'BIST kapalı'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Son güncelleme: {formatRelativeTime(new Date(market.dataUpdatedAt), now)}
              </span>
            </>
          )
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={refreshAll} loading={anyFetching}>
              {!anyFetching && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              Yenile
            </Button>
            <Button size="sm" asChild>
              <Link to="/compare">
                <GitCompare className="h-4 w-4" aria-hidden="true" />
                Karşılaştırma Yap
              </Link>
            </Button>
          </>
        }
      />

      {/* Portfolio summary */}
      {portfolio.isLoading ? (
        <ShimmerStats count={4} />
      ) : portfolio.isError ? (
        <Card>
          <ErrorState
            error={portfolio.error}
            title="Portföy verisi alınamadı"
            onRetry={() => void portfolio.refetch()}
            retrying={portfolio.isFetching}
            compact
          />
        </Card>
      ) : portfolioEmpty ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title="Portföyünüz henüz boş"
            description="İlk yatırımınızı ekleyin; toplam değeriniz, günlük değişiminiz ve dağılımınız burada görünsün."
            actionLabel="İlk Yatırımını Ekle"
            onAction={() => navigate('/portfolio?add=')}
            secondaryLabel="Önce Karşılaştırma Yap"
            onSecondary={() => navigate('/compare')}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Portföy Değeri"
            value={summary?.totalValue ?? 0}
            format="currency"
            icon={Wallet}
            masked={valuesHidden}
            hint={`${summary?.openInvestments ?? 0} açık pozisyon`}
          />
          <StatCard
            title="Toplam Kâr / Zarar"
            value={summary?.totalProfit ?? 0}
            format="currency"
            signed
            icon={TrendingUp}
            masked={valuesHidden}
            footer={<Percent value={summary?.totalProfitPercent ?? 0} className="text-sm" />}
          />
          <StatCard
            title="Günlük Değişim"
            value={summary?.dailyChange ?? 0}
            format="currency"
            signed
            icon={ArrowUpDown}
            masked={valuesHidden}
            footer={<Percent value={summary?.dailyChangePercent ?? 0} className="text-sm" />}
          />
          <StatCard
            title="İzlenen Hisse"
            value={watchlist.data?.length ?? 0}
            icon={Star}
            loading={watchlist.isLoading}
            hint={activeAlerts.length > 0 ? `${activeAlerts.length} aktif alarm` : 'Aktif alarm yok'}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Holdings */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Pozisyonlarım</CardTitle>
            <Button variant="link" size="sm" asChild className="h-auto p-0">
              <Link to="/portfolio">
                Tümü
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {portfolio.isLoading ? (
              <ShimmerTable rows={4} />
            ) : portfolio.isError ? (
              <ErrorState
                error={portfolio.error}
                onRetry={() => void portfolio.refetch()}
                compact
              />
            ) : holdings.length === 0 ? (
              <EmptyState
                icon={Wallet}
                compact
                title="Pozisyon yok"
                description="Portföyünüze bir hisse ekleyin."
                actionLabel="Yatırım Ekle"
                onAction={() => navigate('/portfolio?add=')}
              />
            ) : (
              <ul className="divide-y divide-border">
                {[...holdings]
                  .sort((a, b) => b.currentValue - a.currentValue)
                  .slice(0, 5)
                  .map((holding) => (
                    <li key={holding.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/stocks/${encodeURIComponent(holding.symbol)}`)}
                        className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-accent/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{holding.symbol}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatNumber(holding.quantity, holding.quantity < 10 ? 4 : 2)} adet
                          </p>
                        </div>

                        <div className="text-right">
                          {holding.stale ? (
                            <UnavailableValue />
                          ) : (
                            <span className={cn('block', valuesHidden && 'blur-sm')}>
                              <Money value={holding.currentValue} className="text-sm font-semibold" />
                            </span>
                          )}
                        </div>

                        <div className="w-24 text-right">
                          <ChangeBadge value={holding.profitPercent} size="sm" />
                        </div>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Dağılım</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolio.isLoading ? (
              <ShimmerCard />
            ) : allocation.length === 0 ? (
              <EmptyState
                icon={Wallet}
                compact
                title="Dağılım yok"
                description="Pozisyon ekledikçe portföy dağılımınız burada görünür."
              />
            ) : (
              <>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocation}
                        dataKey="value"
                        nameKey="symbol"
                        innerRadius="58%"
                        outerRadius="88%"
                        paddingAngle={2}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {allocation.map((entry, index) => (
                          <Cell
                            key={entry.symbol}
                            fill={palette.series[index % palette.series.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          background: palette.tooltipBg,
                          border: `1px solid ${palette.tooltipBorder}`,
                          borderRadius: 12,
                          color: palette.text,
                          fontSize: 12,
                        }}
                        formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <ul className="mt-3 space-y-1.5">
                  {allocation.map((entry, index) => {
                    const share =
                      (summary?.totalValue ?? 0) > 0
                        ? (entry.value / (summary?.totalValue ?? 1)) * 100
                        : 0;
                    return (
                      <li key={entry.symbol} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: palette.series[index % palette.series.length] }}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate">{entry.symbol}</span>
                        <span className="text-muted-foreground" data-numeric="">
                          %{formatNumber(share, 1)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Best & worst */}
      {(bestHolding || worstHolding) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {bestHolding && (
            <Card className="p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                En İyi Performans
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{bestHolding.symbol}</p>
                  <p className="truncate text-xs text-muted-foreground">{bestHolding.symbolName}</p>
                </div>
                <ChangeBadge value={bestHolding.profitPercent} />
              </div>
            </Card>
          )}
          {worstHolding && (
            <Card className="p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingDown className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
                En Zayıf Performans
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{worstHolding.symbol}</p>
                  <p className="truncate text-xs text-muted-foreground">{worstHolding.symbolName}</p>
                </div>
                <ChangeBadge value={worstHolding.profitPercent} />
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Market pulse */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Piyasa Nabzı</CardTitle>
            <Button variant="link" size="sm" asChild className="h-auto p-0">
              <Link to="/market">
                Piyasaya Git
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {market.isLoading ? (
              <ShimmerTable rows={3} />
            ) : market.isError ? (
              <ErrorState
                error={market.error}
                title="Piyasa verisi alınamadı"
                onRetry={() => void market.refetch()}
                compact
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[...indices, ...currencies].slice(0, 6).map((quote) => (
                  <div key={quote.symbol} className="rounded-xl border border-border p-3">
                    <p className="truncate text-xs text-muted-foreground">{quote.name}</p>
                    <p className="mt-1 font-semibold" data-numeric="">
                      {formatNumber(quote.price, quote.category === 'CURRENCY' ? 4 : 2)}
                    </p>
                    <div className="mt-1.5">
                      <ChangeBadge value={quote.changePercent} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Watchlist movers */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>İzleme Listem</CardTitle>
            <Button variant="link" size="sm" asChild className="h-auto p-0">
              <Link to="/watchlist">
                Tümü
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {watchlist.isLoading ? (
              <ShimmerTable rows={3} />
            ) : watchlist.isError ? (
              <ErrorState error={watchlist.error} onRetry={() => void watchlist.refetch()} compact />
            ) : topMovers.length === 0 ? (
              <EmptyState
                icon={Star}
                compact
                title="Liste boş"
                description="Takip etmek istediğiniz hisseleri ekleyin."
                actionLabel="Hisse Ekle"
                onAction={() => navigate('/watchlist')}
              />
            ) : (
              <ul className="divide-y divide-border">
                {topMovers.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/stocks/${encodeURIComponent(item.symbol)}`)}
                      className="flex w-full items-center justify-between gap-2 py-2.5 text-left transition-colors hover:bg-accent/50"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {item.symbol}
                      </span>
                      <ChangeBadge value={item.changePercent} size="sm" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent scenarios */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Son Senaryolarım</CardTitle>
            <Button variant="link" size="sm" asChild className="h-auto p-0">
              <Link to="/compare">
                Karşılaştır
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {scenarios.isLoading ? (
              <ShimmerTable rows={2} />
            ) : (scenarios.data?.content.length ?? 0) === 0 ? (
              <EmptyState
                icon={GitCompare}
                compact
                title="Kayıtlı senaryo yok"
                description="Bir karşılaştırma yapıp kaydedin; buradan hızlıca dönebilirsiniz."
                actionLabel="Karşılaştırma Yap"
                onAction={() => navigate('/compare')}
              />
            ) : (
              <ul className="divide-y divide-border">
                {scenarios.data?.content.map((scenario) => {
                  const winnerIsB = scenario.result.difference.winnerSymbol === 'B';
                  return (
                    <li key={scenario.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {scenario.title || `${scenario.symbolA} - ${scenario.symbolB}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(scenario.createdAt)}
                        </p>
                      </div>
                      <Badge variant={winnerIsB ? 'danger' : 'success'} size="sm">
                        {winnerIsB ? scenario.symbolB : scenario.symbolA} önde
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Fiyat Alarmlarım</CardTitle>
            <Button variant="link" size="sm" asChild className="h-auto p-0">
              <Link to="/alerts">
                Tümü
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {alerts.isLoading ? (
              <ShimmerTable rows={2} />
            ) : activeAlerts.length === 0 ? (
              <EmptyState
                icon={BellRing}
                compact
                title="Aktif alarm yok"
                description="Bir hisse hedef fiyata ulaştığında haberdar olmak için alarm kurun."
                actionLabel="Alarm Kur"
                onAction={() => navigate('/alerts')}
              />
            ) : (
              <ul className="divide-y divide-border">
                {activeAlerts.slice(0, 4).map((alert) => (
                  <li key={alert.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{alert.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.direction === 'ABOVE' ? 'üstüne çıkarsa' : 'altına inerse'}{' '}
                        <Money value={alert.targetPrice} price />
                      </p>
                    </div>
                    {alert.currentPrice > 0 && (
                      <div className="text-right">
                        <Money value={alert.currentPrice} price className="block text-sm" />
                        <Percent value={alert.distancePercent} className="text-xs" colored={false} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardContent className="flex flex-wrap gap-2 pt-5 sm:pt-6">
          <Button variant="outline" size="sm" asChild>
            <Link to="/portfolio?add=">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Yatırım Ekle
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/watchlist">
              <Star className="h-4 w-4" aria-hidden="true" />
              İzleme Listesine Ekle
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/alerts">
              <BellRing className="h-4 w-4" aria-hidden="true" />
              Fiyat Alarmı Kur
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

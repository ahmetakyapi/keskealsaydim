import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpDown,
  Circle,
  Coins,
  DollarSign,
  Flag,
  Globe,
  LineChart,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader } from '@/components/ui/page-header';
import { ShimmerTable } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChangeBadge, Money } from '@/components/ui/value';
import { useMarketOverview } from '@/hooks/useQueries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { cn, formatCompact, formatNumber, formatRelativeTime, matchesQuery } from '@/lib/utils';
import type { MarketCategory, MarketQuote } from '@/types';

const CATEGORY_TABS: Array<{ value: MarketCategory | 'ALL'; label: string; icon: typeof Globe }> = [
  { value: 'ALL', label: 'Tümü', icon: Globe },
  { value: 'INDEX', label: 'Endeksler', icon: LineChart },
  { value: 'BIST', label: 'BIST', icon: Flag },
  { value: 'US', label: 'ABD', icon: Globe },
  { value: 'CURRENCY', label: 'Döviz', icon: DollarSign },
  { value: 'COMMODITY', label: 'Emtia', icon: Coins },
];

type SortKey = 'changeDesc' | 'changeAsc' | 'volume' | 'marketCap' | 'symbol';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'changeDesc', label: 'En Çok Yükselenler' },
  { value: 'changeAsc', label: 'En Çok Düşenler' },
  { value: 'volume', label: 'Hacme Göre' },
  { value: 'marketCap', label: 'Piyasa Değerine Göre' },
  { value: 'symbol', label: 'Sembole Göre' },
];

/** Only equities belong in a breadth statistic — FX and gold are not stocks. */
const EQUITY_CATEGORIES: MarketCategory[] = ['BIST', 'US'];

export default function MarketPage() {
  useDocumentTitle('Piyasa');
  const navigate = useNavigate();
  const now = useNow(30_000);

  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } =
    useMarketOverview();

  const [category, setCategory] = useState<MarketCategory | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('changeDesc');

  const quotes = useMemo(() => data?.quotes ?? [], [data]);

  const visibleQuotes = useMemo(() => {
    const filtered = quotes.filter((quote) => {
      if (category !== 'ALL' && quote.category !== category) return false;
      if (!query) return true;
      return matchesQuery(quote.symbol, query) || matchesQuery(quote.name, query);
    });

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'changeAsc':
          return a.changePercent - b.changePercent;
        case 'volume':
          return b.volume - a.volume;
        case 'marketCap':
          return b.marketCap - a.marketCap;
        case 'symbol':
          return a.symbol.localeCompare(b.symbol, 'tr');
        default:
          return b.changePercent - a.changePercent;
      }
    });
  }, [quotes, category, query, sortKey]);

  const breadth = useMemo(() => {
    const equities = quotes.filter((quote) => EQUITY_CATEGORIES.includes(quote.category));
    const advancing = equities.filter((quote) => quote.changePercent > 0).length;
    const declining = equities.filter((quote) => quote.changePercent < 0).length;
    const flat = equities.length - advancing - declining;
    return { advancing, declining, flat, total: equities.length };
  }, [quotes]);

  const indices = quotes.filter((quote) => quote.category === 'INDEX');
  const currencies = quotes.filter((quote) => quote.category === 'CURRENCY');

  const marketState = data?.marketState ?? 'UNKNOWN';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Piyasa"
        description="Endeksler, döviz, emtia ve öne çıkan hisseler tek ekranda."
        meta={
          data && (
            <>
              <Badge variant={marketState === 'OPEN' ? 'success' : 'neutral'} size="sm">
                <Circle
                  className={cn('h-2 w-2 fill-current', marketState === 'OPEN' && 'animate-pulse')}
                  aria-hidden="true"
                />
                {marketState === 'OPEN'
                  ? 'BIST açık'
                  : marketState === 'CLOSED'
                    ? 'BIST kapalı'
                    : 'Seans durumu bilinmiyor'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Son güncelleme: {formatRelativeTime(new Date(dataUpdatedAt), now)}
              </span>
              {data.partial && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Badge variant="warning" size="sm">
                        Kısmi veri
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {data.requestedSymbols} sembolden {data.resolvedSymbols} tanesi alınabildi.
                    Eksik olanlar listede görünmüyor.
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            loading={isFetching && !isLoading}
          >
            {!(isFetching && !isLoading) && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            Yenile
          </Button>
        }
      />

      {isError ? (
        <Card>
          <ErrorState
            error={error}
            title="Piyasa verisi alınamadı"
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        </Card>
      ) : (
        <>
          {/* Headline strip */}
          {isLoading ? (
            <ShimmerTable rows={2} />
          ) : (
            (indices.length > 0 || currencies.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[...indices, ...currencies].slice(0, 8).map((quote) => (
                  <Card key={quote.symbol} className="p-4">
                    <p className="truncate text-xs text-muted-foreground">{quote.name}</p>
                    <p className="mt-1 text-lg font-semibold" data-numeric="">
                      {formatNumber(quote.price, quote.category === 'CURRENCY' ? 4 : 2)}
                    </p>
                    <div className="mt-2">
                      <ChangeBadge value={quote.changePercent} size="sm" />
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}

          {/* Breadth */}
          {!isLoading && breadth.total > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Takip Edilen Hisselerde Yön Dağılımı</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Bu oran, uygulamanın izlediği {breadth.total} hisse üzerinden hesaplanır; borsanın
                  tamamını temsil etmez.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-success"
                    style={{ width: `${(breadth.advancing / breadth.total) * 100}%` }}
                  />
                  <div
                    className="bg-muted-foreground/30"
                    style={{ width: `${(breadth.flat / breadth.total) * 100}%` }}
                  />
                  <div
                    className="bg-danger"
                    style={{ width: `${(breadth.declining / breadth.total) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-success">
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                    {breadth.advancing} yükselen
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    {breadth.flat} yatay
                  </span>
                  <span className="flex items-center gap-1.5 text-danger">
                    <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                    {breadth.declining} düşen
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs
                  value={category}
                  onValueChange={(value) => setCategory(value as MarketCategory | 'ALL')}
                >
                  <TabsList>
                    {CATEGORY_TABS.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value}>
                        <tab.icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-full sm:w-52">
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Sembol veya şirket ara"
                      aria-label="Piyasa listesinde ara"
                      icon={<Search className="h-4 w-4" />}
                      className="h-9"
                    />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden sm:inline">
                          {SORT_OPTIONS.find((option) => option.value === sortKey)?.label}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {SORT_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onSelect={() => setSortKey(option.value)}
                          className={cn(sortKey === option.value && 'bg-accent')}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <ShimmerTable rows={8} />
              ) : visibleQuotes.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {query ? `“${query}” için sonuç bulunamadı.` : 'Bu kategoride veri yok.'}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {visibleQuotes.map((quote) => (
                    <QuoteRow
                      key={quote.symbol}
                      quote={quote}
                      onOpen={() => navigate(`/stocks/${encodeURIComponent(quote.symbol)}`)}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Veriler Yahoo Finance üzerinden alınır ve 15 dakikaya kadar gecikmeli olabilir. Yatırım
            tavsiyesi değildir.
          </p>
        </>
      )}
    </div>
  );
}

function QuoteRow({ quote, onOpen }: { quote: MarketQuote; onOpen: () => void }) {
  const decimals = quote.category === 'CURRENCY' ? 4 : 2;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-accent/50"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{quote.symbol.replace(/\.IS$/, '')}</p>
          <p className="truncate text-xs text-muted-foreground">{quote.name}</p>
        </div>

        <div className="hidden text-right sm:block">
          <p className="text-xs text-muted-foreground">Hacim</p>
          <p className="text-xs" data-numeric="">
            {quote.volume > 0 ? formatCompact(quote.volume) : '—'}
          </p>
        </div>

        <div className="hidden text-right md:block">
          <p className="text-xs text-muted-foreground">Piyasa Değeri</p>
          <p className="text-xs" data-numeric="">
            {quote.marketCap > 0 ? formatCompact(quote.marketCap) : '—'}
          </p>
        </div>

        <div className="w-28 text-right">
          {quote.currency && quote.currency !== 'TRY' ? (
            <Money value={quote.price} currency={quote.currency} price className="text-sm font-semibold" />
          ) : (
            <span className="text-sm font-semibold" data-numeric="">
              {formatNumber(quote.price, decimals)}
            </span>
          )}
        </div>

        <div className="w-24 text-right">
          <ChangeBadge value={quote.changePercent} size="sm" />
        </div>
      </button>
    </li>
  );
}

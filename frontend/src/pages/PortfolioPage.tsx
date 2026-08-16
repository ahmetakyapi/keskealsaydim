import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  AlertTriangle,
  ArrowUpDown,
  Banknote,
  Download,
  Eye,
  EyeOff,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { ShimmerStats } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChangeBadge, Money, Percent, UnavailableValue } from '@/components/ui/value';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SymbolSearch } from '@/components/SymbolSearch';
import {
  useAddInvestment,
  useDeleteInvestment,
  usePortfolio,
  useSellInvestment,
  useStockQuote,
  useUpdateInvestment,
  useUserProfile,
} from '@/hooks/useQueries';
import { useChartPalette } from '@/hooks/useChartPalette';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  cn,
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeTime,
  matchesQuery,
  TODAY_ISO,
} from '@/lib/utils';
import type { Investment } from '@/types';

type SortKey = 'value' | 'profit' | 'profitPercent' | 'symbol' | 'weight';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'value', label: 'Değere Göre' },
  { value: 'profit', label: 'Kâra Göre' },
  { value: 'profitPercent', label: 'Getiri Yüzdesine Göre' },
  { value: 'weight', label: 'Ağırlığa Göre' },
  { value: 'symbol', label: 'Sembole Göre' },
];

export default function PortfolioPage() {
  useDocumentTitle('Portföyüm');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const palette = useChartPalette();
  const now = useNow(30_000);

  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = usePortfolio();
  const { data: profile } = useUserProfile();
  const deleteInvestment = useDeleteInvestment();

  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [addOpen, setAddOpen] = useState(Boolean(searchParams.get('add')));
  const [editing, setEditing] = useState<Investment | null>(null);
  const [selling, setSelling] = useState<Investment | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Investment | null>(null);

  // Respects the "hide portfolio value" preference from Settings.
  const [valuesHidden, setValuesHidden] = useState(false);
  useEffect(() => {
    if (profile?.settings) setValuesHidden(!profile.settings.showPortfolioValue);
  }, [profile?.settings]);

  const holdings = useMemo(() => data?.holdings ?? [], [data]);
  const closed = useMemo(() => data?.closedPositions ?? [], [data]);
  const staleCount = holdings.filter((holding) => holding.stale).length;

  const visibleHoldings = useMemo(() => {
    const filtered = holdings.filter(
      (holding) => matchesQuery(holding.symbol, query) || matchesQuery(holding.symbolName, query)
    );

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'symbol':
          return a.symbol.localeCompare(b.symbol, 'tr');
        case 'profit':
          return b.profit - a.profit;
        case 'profitPercent':
          return b.profitPercent - a.profitPercent;
        case 'weight':
          return b.weight - a.weight;
        default:
          return b.currentValue - a.currentValue;
      }
    });
  }, [holdings, query, sortKey]);

  // Multiple lots of the same symbol are one slice, not several.
  const allocation = useMemo(() => {
    const bySymbol = new Map<string, number>();
    for (const holding of holdings) {
      bySymbol.set(holding.symbol, (bySymbol.get(holding.symbol) ?? 0) + holding.currentValue);
    }
    return [...bySymbol.entries()]
      .map(([symbol, value]) => ({ symbol, value }))
      .sort((a, b) => b.value - a.value);
  }, [holdings]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteInvestment.mutateAsync(pendingDelete.id);
      toast.success(`${pendingDelete.symbol} portföyden kaldırıldı`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const exportCsv = () => {
    const header = [
      'Sembol', 'Ad', 'Adet', 'Alış Fiyatı', 'Alış Tarihi', 'Komisyon',
      'Güncel Fiyat', 'Para Birimi', 'Maliyet (TRY)', 'Değer (TRY)', 'Kâr (TRY)', 'Getiri %',
    ];
    const rows = holdings.map((holding) => [
      holding.symbol, holding.symbolName, holding.quantity, holding.buyPrice,
      holding.buyDate, holding.buyCommission, holding.currentPrice, holding.currency,
      holding.totalCost, holding.currentValue, holding.profit, holding.profitPercent,
    ]);

    // Semicolon-separated with a BOM: Turkish Excel reads commas as decimals.
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfoy-${TODAY_ISO()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Portföyüm"
        description="Tüm pozisyonlarınız ve toplamlarınız Türk lirası cinsinden gösterilir."
        meta={
          data && (
            <>
              <span className="text-xs text-muted-foreground">
                Son güncelleme: {formatRelativeTime(new Date(dataUpdatedAt), now)}
              </span>
              {staleCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Badge variant="warning" size="sm">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        {staleCount} pozisyonun fiyatı alınamadı
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Bu pozisyonlar için güncel fiyat çekilemedi; maliyet fiyatı gösteriliyor ve
                    kâr/zarar hesabına dahil edilmiyor.
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setValuesHidden((current) => !current)}
              aria-label={valuesHidden ? 'Tutarları göster' : 'Tutarları gizle'}
            >
              {valuesHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              loading={isFetching && !isLoading}
            >
              {!(isFetching && !isLoading) && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              Yenile
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={holdings.length === 0}>
              <Download className="h-4 w-4" aria-hidden="true" />
              CSV
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Yatırım Ekle
            </Button>
          </>
        }
      />

      {isLoading ? (
        <ShimmerStats count={4} />
      ) : isError ? (
        <Card>
          <ErrorState
            error={error}
            title="Portföy yüklenemedi"
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Toplam Değer"
              value={data?.totalValue ?? 0}
              format="currency"
              icon={Wallet}
              masked={valuesHidden}
              hint={`${data?.openInvestments ?? 0} açık pozisyon`}
            />
            <StatCard
              title="Toplam Maliyet"
              value={data?.totalCost ?? 0}
              format="currency"
              icon={Banknote}
              masked={valuesHidden}
            />
            <StatCard
              title="Açık Kâr / Zarar"
              value={data?.totalProfit ?? 0}
              format="currency"
              signed
              icon={TrendingUp}
              masked={valuesHidden}
              footer={<Percent value={data?.totalProfitPercent ?? 0} className="text-sm" />}
            />
            <StatCard
              title="Günlük Değişim"
              value={data?.dailyChange ?? 0}
              format="currency"
              signed
              icon={ArrowUpDown}
              masked={valuesHidden}
              footer={<Percent value={data?.dailyChangePercent ?? 0} className="text-sm" />}
            />
          </div>

          {(data?.realizedProfit ?? 0) !== 0 && (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5 sm:pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Gerçekleşen Kâr / Zarar</p>
                  <p className="mt-1 text-xl font-semibold">
                    <Money value={data?.realizedProfit ?? 0} signed className={cn(valuesHidden && 'blur-sm')} />
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setTab('closed')}>
                  Kapanan Pozisyonlar ({closed.length})
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                <CardTitle>Pozisyonlar</CardTitle>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-full sm:w-48">
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Pozisyon ara"
                      aria-label="Pozisyonlarda ara"
                      icon={<Search className="h-4 w-4" />}
                      className="h-9"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
                        {SORT_OPTIONS.find((option) => option.value === sortKey)?.label}
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
              </CardHeader>

              <CardContent>
                <Tabs value={tab} onValueChange={(value) => setTab(value as 'open' | 'closed')}>
                  <TabsList>
                    <TabsTrigger value="open">Açık ({holdings.length})</TabsTrigger>
                    <TabsTrigger value="closed">Kapanan ({closed.length})</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="mt-4">
                  {tab === 'open' ? (
                    holdings.length === 0 ? (
                      <EmptyState
                        icon={Wallet}
                        compact
                        title="Portföyünüz boş"
                        description="İlk yatırımınızı ekleyin; güncel değeri, kâr/zararı ve dağılımı burada takip edin."
                        actionLabel="Yatırım Ekle"
                        onAction={() => setAddOpen(true)}
                      />
                    ) : visibleHoldings.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        “{query}” için pozisyon bulunamadı.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {visibleHoldings.map((holding) => (
                          <HoldingRow
                            key={holding.id}
                            holding={holding}
                            masked={valuesHidden}
                            onOpen={() => navigate(`/stocks/${encodeURIComponent(holding.symbol)}`)}
                            onEdit={() => setEditing(holding)}
                            onSell={() => setSelling(holding)}
                            onDelete={() => setPendingDelete(holding)}
                          />
                        ))}
                      </ul>
                    )
                  ) : closed.length === 0 ? (
                    <EmptyState
                      icon={Banknote}
                      compact
                      title="Kapanan pozisyon yok"
                      description="Bir pozisyonu sattığınızda gerçekleşen kâr/zararıyla birlikte burada listelenir."
                    />
                  ) : (
                    <ul className="space-y-2">
                      {closed.map((position) => (
                        <li
                          key={position.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{position.symbol}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatNumber(position.quantity, 2)} adet ·{' '}
                              {formatDate(position.buyDate)} → {formatDate(position.sellDate)} ·{' '}
                              {position.holdingDays} gün
                            </p>
                          </div>
                          <div className="text-right">
                            <Money
                              value={position.profit}
                              signed
                              className={cn('text-sm font-semibold', valuesHidden && 'blur-sm')}
                            />
                            <Percent value={position.profitPercent} className="block text-xs" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dağılım</CardTitle>
              </CardHeader>
              <CardContent>
                {allocation.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Dağılım için pozisyon ekleyin.
                  </p>
                ) : (
                  <>
                    <div className="h-52 w-full">
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
                      {allocation.slice(0, 6).map((entry, index) => {
                        const share =
                          (data?.totalValue ?? 0) > 0 ? (entry.value / (data?.totalValue ?? 1)) * 100 : 0;
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
                      {allocation.length > 6 && (
                        <li className="text-xs text-muted-foreground">
                          +{allocation.length - 6} pozisyon daha
                        </li>
                      )}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <AddInvestmentDialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open && searchParams.get('add')) {
            searchParams.delete('add');
            setSearchParams(searchParams, { replace: true });
          }
        }}
        initialSymbol={searchParams.get('add') ?? ''}
      />

      <EditInvestmentDialog holding={editing} onClose={() => setEditing(null)} />
      <SellInvestmentDialog holding={selling} onClose={() => setSelling(null)} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Pozisyon silinsin mi?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-foreground">{pendingDelete.symbol}</span> pozisyonu
              kalıcı olarak silinecek. Sattığınız bir pozisyonu kayıt altında tutmak istiyorsanız
              silmek yerine <span className="font-medium text-foreground">Sat</span> işlemini
              kullanın.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Sil"
        destructive
        loading={deleteInvestment.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ── Row ─────────────────────────────────────────────────────────────────────

function HoldingRow({
  holding,
  masked,
  onOpen,
  onEdit,
  onSell,
  onDelete,
}: {
  holding: Investment;
  masked: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onSell: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-xl border border-border p-3 transition-colors hover:border-primary/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{holding.symbol}</span>
            {holding.currency !== 'TRY' && (
              <Badge variant="outline" size="sm">
                {holding.currency}
              </Badge>
            )}
            {holding.stale && (
              <Badge variant="warning" size="sm">
                Fiyat alınamadı
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{holding.symbolName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatNumber(holding.quantity, holding.quantity < 10 ? 4 : 2)} adet ·{' '}
            <Money value={holding.buyPrice} currency={holding.currency} price /> ·{' '}
            {formatDate(holding.buyDate)}
          </p>
        </button>

        <div className="flex items-center gap-3">
          <div className="text-right">
            {holding.stale ? (
              <UnavailableValue />
            ) : (
              <>
                <Money
                  value={holding.currentValue}
                  className={cn('block text-sm font-semibold', masked && 'blur-sm')}
                />
                <span className={cn('block', masked && 'blur-sm')}>
                  <Money value={holding.profit} signed className="text-xs" />
                </span>
              </>
            )}
          </div>

          <div className="text-right">
            <ChangeBadge value={holding.profitPercent} size="sm" />
            <p className="mt-1 text-[11px] text-muted-foreground" data-numeric="">
              ağırlık %{formatNumber(holding.weight, 1)}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`${holding.symbol} işlemleri`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onOpen}>Detayı Aç</DropdownMenuItem>
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Düzenle
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onSell}>
                <Banknote className="h-4 w-4" aria-hidden="true" />
                Sat / Kapat
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={onDelete}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}

// ── Dialogs ─────────────────────────────────────────────────────────────────

function AddInvestmentDialog({
  open,
  onOpenChange,
  initialSymbol,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSymbol: string;
}) {
  const addInvestment = useAddInvestment();

  const [symbol, setSymbol] = useState(initialSymbol);
  const [symbolName, setSymbolName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState(TODAY_ISO());
  const [commission, setCommission] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: quote } = useStockQuote(open && symbol ? symbol : undefined);

  useEffect(() => {
    if (open) setSymbol(initialSymbol);
  }, [open, initialSymbol]);

  const reset = () => {
    setSymbol('');
    setSymbolName('');
    setQuantity('');
    setBuyPrice('');
    setBuyDate(TODAY_ISO());
    setCommission('');
    setNotes('');
    setErrors({});
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const next: Record<string, string> = {};
    if (!symbol) next.symbol = 'Bir hisse seçin';

    const quantityValue = Number(quantity.replace(',', '.'));
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) next.quantity = 'Adet pozitif olmalı';

    const priceValue = Number(buyPrice.replace(',', '.'));
    if (!Number.isFinite(priceValue) || priceValue <= 0) next.buyPrice = 'Alış fiyatı pozitif olmalı';

    const commissionValue = commission ? Number(commission.replace(',', '.')) : 0;
    if (!Number.isFinite(commissionValue) || commissionValue < 0) {
      next.commission = 'Komisyon negatif olamaz';
    }

    if (!buyDate) next.buyDate = 'Alış tarihi gerekli';
    else if (buyDate > TODAY_ISO()) next.buyDate = 'Alış tarihi gelecekte olamaz';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await addInvestment.mutateAsync({
        symbol,
        symbolName: symbolName || undefined,
        quantity: quantityValue,
        buyPrice: priceValue,
        buyDate,
        buyCommission: commissionValue,
        notes: notes || undefined,
      });
      toast.success(`${symbol} portföye eklendi`);
      reset();
      onOpenChange(false);
    } catch (err) {
      setErrors({ form: getApiErrorMessage(err) });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yatırım Ekle</DialogTitle>
          <DialogDescription>
            Hisseyi listeden seçin; sembol doğrulanmadan kayıt yapılmaz.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <SymbolSearch
            label="Hisse"
            value={symbol}
            error={errors.symbol}
            onSelect={(item) => {
              setSymbol(item.symbol);
              setSymbolName(item.name);
              setErrors((prev) => ({ ...prev, symbol: '' }));
            }}
            onClear={() => {
              setSymbol('');
              setSymbolName('');
            }}
          />

          {quote && quote.price > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                Güncel fiyat:{' '}
                <Money
                  value={quote.price}
                  currency={quote.currency}
                  price
                  className="font-medium text-foreground"
                />
              </span>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => setBuyPrice(String(quote.price))}
              >
                Alış fiyatı olarak kullan
              </Button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="add-quantity">Adet</Label>
              <Input
                id="add-quantity"
                inputMode="decimal"
                placeholder="Örn. 12,5"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                error={errors.quantity}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="add-price">
                Alış Fiyatı{quote?.currency && quote.currency !== 'TRY' ? ` (${quote.currency})` : ''}
              </Label>
              <Input
                id="add-price"
                inputMode="decimal"
                placeholder="Örn. 285,50"
                value={buyPrice}
                onChange={(event) => setBuyPrice(event.target.value)}
                error={errors.buyPrice}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="add-date">Alış Tarihi</Label>
              <Input
                id="add-date"
                type="date"
                max={TODAY_ISO()}
                value={buyDate}
                onChange={(event) => setBuyDate(event.target.value)}
                error={errors.buyDate}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="add-commission">Komisyon (İsteğe Bağlı)</Label>
              <Input
                id="add-commission"
                inputMode="decimal"
                placeholder="0"
                value={commission}
                onChange={(event) => setCommission(event.target.value)}
                error={errors.commission}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="add-notes">Not (İsteğe Bağlı)</Label>
            <Input
              id="add-notes"
              value={notes}
              maxLength={280}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Neden aldınız?"
              className="mt-1.5"
            />
          </div>

          {errors.form && (
            <p role="alert" className="text-sm text-danger">
              {errors.form}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Vazgeç
            </Button>
            <Button type="submit" loading={addInvestment.isPending}>
              Ekle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditInvestmentDialog({
  holding,
  onClose,
}: {
  holding: Investment | null;
  onClose: () => void;
}) {
  const updateInvestment = useUpdateInvestment();
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState('');
  const [commission, setCommission] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!holding) return;
    setQuantity(String(holding.quantity));
    setBuyPrice(String(holding.buyPrice));
    setBuyDate(holding.buyDate);
    setCommission(String(holding.buyCommission ?? 0));
    setNotes(holding.notes ?? '');
    setFormError('');
  }, [holding]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!holding) return;

    try {
      await updateInvestment.mutateAsync({
        id: holding.id,
        data: {
          quantity: Number(quantity.replace(',', '.')),
          buyPrice: Number(buyPrice.replace(',', '.')),
          buyDate,
          buyCommission: Number(commission.replace(',', '.')) || 0,
          notes,
        },
      });
      toast.success('Pozisyon güncellendi');
      onClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  return (
    <Dialog open={holding !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{holding?.symbol} Pozisyonunu Düzenle</DialogTitle>
          <DialogDescription>Yanlış girilen adet, fiyat veya tarihi düzeltin.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-quantity">Adet</Label>
              <Input
                id="edit-quantity"
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-price">Alış Fiyatı</Label>
              <Input
                id="edit-price"
                inputMode="decimal"
                value={buyPrice}
                onChange={(event) => setBuyPrice(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-date">Alış Tarihi</Label>
              <Input
                id="edit-date"
                type="date"
                max={TODAY_ISO()}
                value={buyDate}
                onChange={(event) => setBuyDate(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-commission">Komisyon</Label>
              <Input
                id="edit-commission"
                inputMode="decimal"
                value={commission}
                onChange={(event) => setCommission(event.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-notes">Not</Label>
            <Input
              id="edit-notes"
              value={notes}
              maxLength={280}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1.5"
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" loading={updateInvestment.isPending}>
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SellInvestmentDialog({
  holding,
  onClose,
}: {
  holding: Investment | null;
  onClose: () => void;
}) {
  const sellInvestment = useSellInvestment();
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(TODAY_ISO());
  const [quantity, setQuantity] = useState('');
  const [commission, setCommission] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!holding) return;
    setSellPrice(holding.stale ? '' : String(holding.currentPrice));
    setSellDate(TODAY_ISO());
    setQuantity(String(holding.quantity));
    setCommission('');
    setFormError('');
  }, [holding]);

  const soldQuantity = Number(quantity.replace(',', '.'));
  const priceValue = Number(sellPrice.replace(',', '.'));
  const partial = holding ? soldQuantity > 0 && soldQuantity < holding.quantity : false;

  const estimatedProfit =
    holding && Number.isFinite(priceValue) && Number.isFinite(soldQuantity)
      ? (priceValue - holding.buyPrice) * soldQuantity - (Number(commission.replace(',', '.')) || 0)
      : 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!holding) return;

    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setFormError('Geçerli bir satış fiyatı girin');
      return;
    }
    if (!Number.isFinite(soldQuantity) || soldQuantity <= 0 || soldQuantity > holding.quantity) {
      setFormError(`Adet 0 ile ${formatNumber(holding.quantity, 4)} arasında olmalı`);
      return;
    }

    try {
      const response = await sellInvestment.mutateAsync({
        id: holding.id,
        data: {
          sellPrice: priceValue,
          sellDate,
          quantity: soldQuantity,
          sellCommission: Number(commission.replace(',', '.')) || 0,
        },
      });
      toast.success(
        response.partial
          ? `${holding.symbol} kısmen satıldı`
          : `${holding.symbol} pozisyonu kapatıldı`
      );
      onClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  return (
    <Dialog open={holding !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{holding?.symbol} Pozisyonunu Sat</DialogTitle>
          <DialogDescription>
            Tamamını ya da bir kısmını satabilirsiniz. Kısmi satışta kalan pozisyon açık kalır.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sell-quantity">
                Satılacak Adet (en fazla {holding ? formatNumber(holding.quantity, 4) : '0'})
              </Label>
              <Input
                id="sell-quantity"
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="sell-price">
                Satış Fiyatı{holding && holding.currency !== 'TRY' ? ` (${holding.currency})` : ''}
              </Label>
              <Input
                id="sell-price"
                inputMode="decimal"
                value={sellPrice}
                onChange={(event) => setSellPrice(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="sell-date">Satış Tarihi</Label>
              <Input
                id="sell-date"
                type="date"
                min={holding?.buyDate}
                max={TODAY_ISO()}
                value={sellDate}
                onChange={(event) => setSellDate(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="sell-commission">Komisyon (İsteğe Bağlı)</Label>
              <Input
                id="sell-commission"
                inputMode="decimal"
                placeholder="0"
                value={commission}
                onChange={(event) => setCommission(event.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          {holding && Number.isFinite(estimatedProfit) && priceValue > 0 && (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">Tahmini kâr/zarar: </span>
              <Money value={estimatedProfit} currency={holding.currency} signed className="font-medium" />
              {partial && <span className="ml-1 text-xs text-muted-foreground">(kısmi satış)</span>}
            </p>
          )}

          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" loading={sellInvestment.isPending}>
              Satışı Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, BellPlus, BellRing, Play, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { ShimmerRow } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Money, Percent } from '@/components/ui/value';
import { SymbolSearch } from '@/components/SymbolSearch';
import { useAlerts, useCreateAlert, useDeleteAlert, useStockQuote, useUpdateAlert } from '@/hooks/useQueries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn, formatDate, TODAY_ISO } from '@/lib/utils';
import type { AlertDirection, AlertStatus, PriceAlert } from '@/types';

const STATUS_META: Record<AlertStatus, { label: string; variant: 'default' | 'success' | 'neutral' | 'warning' }> = {
  ACTIVE: { label: 'Aktif', variant: 'default' },
  TRIGGERED: { label: 'Tetiklendi', variant: 'success' },
  CANCELLED: { label: 'İptal Edildi', variant: 'neutral' },
  EXPIRED: { label: 'Süresi Doldu', variant: 'neutral' },
};

type FilterValue = 'active' | 'triggered' | 'all';

export default function AlertsPage() {
  useDocumentTitle('Fiyat Alarmları');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data, isLoading, isError, error, refetch, isFetching } = useAlerts();
  const createAlert = useCreateAlert();
  const updateAlert = useUpdateAlert();
  const deleteAlert = useDeleteAlert();

  const [filter, setFilter] = useState<FilterValue>('active');
  const [formOpen, setFormOpen] = useState(Boolean(searchParams.get('symbol')));
  const [pendingDelete, setPendingDelete] = useState<PriceAlert | null>(null);

  const alerts = useMemo(() => data?.content ?? [], [data]);
  const activeCount = alerts.filter((alert) => alert.status === 'ACTIVE').length;
  const triggeredCount = alerts.filter((alert) => alert.status === 'TRIGGERED').length;

  const visibleAlerts = useMemo(() => {
    switch (filter) {
      case 'active':
        return alerts.filter((alert) => alert.status === 'ACTIVE');
      case 'triggered':
        return alerts.filter((alert) => alert.status === 'TRIGGERED');
      default:
        return alerts;
    }
  }, [alerts, filter]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteAlert.mutateAsync(pendingDelete.id);
      toast.success(`${pendingDelete.symbol} alarmı silindi`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const toggleStatus = async (alert: PriceAlert) => {
    const nextStatus = alert.status === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE';
    try {
      await updateAlert.mutateAsync({ id: alert.id, data: { status: nextStatus } });
      toast.success(nextStatus === 'ACTIVE' ? 'Alarm yeniden başlatıldı' : 'Alarm durduruldu');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fiyat Alarmları"
        description="Bir hisse belirlediğiniz seviyeye ulaştığında bildirim alın. Alarmlar bu sayfayı her açtığınızda güncel fiyatla değerlendirilir."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <BellPlus className="h-4 w-4" aria-hidden="true" />
            Yeni Alarm
          </Button>
        }
      />

      <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterValue)}>
        <TabsList>
          <TabsTrigger value="active">Aktif{activeCount > 0 ? ` (${activeCount})` : ''}</TabsTrigger>
          <TabsTrigger value="triggered">
            Tetiklenen{triggeredCount > 0 ? ` (${triggeredCount})` : ''}
          </TabsTrigger>
          <TabsTrigger value="all">Tümü</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <ShimmerRow key={`alert-skeleton-${index}`} />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />
        </Card>
      ) : visibleAlerts.length === 0 ? (
        <Card>
          <EmptyState
            icon={BellRing}
            title={filter === 'all' ? 'Henüz alarm kurmadınız' : 'Bu filtrede alarm yok'}
            description="Takip ettiğiniz bir hisse hedef fiyata ulaştığında haberdar olmak için alarm kurun."
            actionLabel="Yeni Alarm Kur"
            onAction={() => setFormOpen(true)}
            secondaryLabel="İzleme Listeme Git"
            onSecondary={() => navigate('/watchlist')}
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {visibleAlerts.map((alert) => {
            const statusMeta = STATUS_META[alert.status];
            const DirectionIcon = alert.direction === 'ABOVE' ? ArrowUp : ArrowDown;
            const reached =
              alert.direction === 'ABOVE'
                ? alert.currentPrice >= alert.targetPrice
                : alert.currentPrice > 0 && alert.currentPrice <= alert.targetPrice;

            return (
              <li key={alert.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/stocks/${encodeURIComponent(alert.symbol)}`)}
                          className="text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {alert.symbol}
                        </button>
                        <Badge variant={statusMeta.variant} size="sm">
                          {statusMeta.label}
                        </Badge>
                      </div>
                      {/* The API falls back to the symbol when no name was
                          supplied; repeating it reads as a rendering bug. */}
                      {alert.symbolName !== alert.symbol && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {alert.symbolName}
                        </p>
                      )}

                      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
                        <DirectionIcon
                          className={cn(
                            'h-4 w-4',
                            alert.direction === 'ABOVE' ? 'text-success' : 'text-danger'
                          )}
                          aria-hidden="true"
                        />
                        <span className="text-muted-foreground">
                          {alert.direction === 'ABOVE' ? 'Şu seviyenin üstünde:' : 'Şu seviyenin altında:'}
                        </span>
                        <Money value={alert.targetPrice} currency="TRY" price className="font-medium" />
                      </p>

                      {alert.expiresAt && alert.status === 'ACTIVE' && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Son geçerlilik: {formatDate(alert.expiresAt)}
                        </p>
                      )}
                      {alert.status === 'TRIGGERED' && alert.triggeredAt && (
                        <p className="mt-1 text-xs text-success">
                          {formatDate(alert.triggeredAt)} tarihinde tetiklendi
                          {alert.triggeredPrice ? ` · ${alert.triggeredPrice.toFixed(2)}` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Güncel</p>
                        {alert.currentPrice > 0 ? (
                          <>
                            <Money
                              value={alert.currentPrice}
                              price
                              className="block text-sm font-semibold"
                            />
                            <Percent
                              value={alert.distancePercent}
                              className="text-xs"
                              colored={false}
                            />
                            <span className="ml-1 text-xs text-muted-foreground">hedefe göre</span>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">—</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {(alert.status === 'ACTIVE' || alert.status === 'CANCELLED') && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={alert.status === 'ACTIVE' ? 'Alarmı durdur' : 'Alarmı başlat'}
                            onClick={() => void toggleStatus(alert)}
                          >
                            {alert.status === 'ACTIVE' ? (
                              <Square className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${alert.symbol} alarmını sil`}
                          onClick={() => setPendingDelete(alert)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {alert.status === 'ACTIVE' && reached && (
                    <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
                      Hedef seviyeye ulaşıldı — bildirim oluşturuldu.
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <AlertFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open && searchParams.get('symbol')) {
            searchParams.delete('symbol');
            setSearchParams(searchParams, { replace: true });
          }
        }}
        initialSymbol={searchParams.get('symbol') ?? ''}
        submitting={createAlert.isPending}
        onSubmit={async (values) => {
          await createAlert.mutateAsync(values);
          toast.success(`${values.symbol} için alarm kuruldu`);
          setFormOpen(false);
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Alarm silinsin mi?"
        description={
          pendingDelete
            ? `${pendingDelete.symbol} için kurduğunuz alarm kalıcı olarak silinecek.`
            : ''
        }
        confirmLabel="Sil"
        destructive
        loading={deleteAlert.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ── Create form ─────────────────────────────────────────────────────────────

interface AlertFormValues {
  symbol: string;
  symbolName?: string;
  targetPrice: number;
  direction: AlertDirection;
  expiresAt?: string;
}

function AlertFormDialog({
  open,
  onOpenChange,
  initialSymbol,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSymbol: string;
  submitting: boolean;
  onSubmit: (values: AlertFormValues) => Promise<void>;
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [symbolName, setSymbolName] = useState('');
  const [direction, setDirection] = useState<AlertDirection>('ABOVE');
  const [targetPrice, setTargetPrice] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Showing the live price next to the target makes the threshold meaningful.
  const { data: quote } = useStockQuote(symbol || undefined);

  const reset = () => {
    setSymbol('');
    setSymbolName('');
    setDirection('ABOVE');
    setTargetPrice('');
    setExpiresAt('');
    setErrors({});
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!symbol) nextErrors.symbol = 'Bir hisse seçin';
    const price = Number(targetPrice.replace(',', '.'));
    if (!Number.isFinite(price) || price <= 0) nextErrors.targetPrice = 'Geçerli bir hedef fiyat girin';
    if (expiresAt && expiresAt <= TODAY_ISO()) nextErrors.expiresAt = 'Bitiş tarihi gelecekte olmalı';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await onSubmit({
        symbol,
        symbolName: symbolName || undefined,
        targetPrice: price,
        direction,
        expiresAt: expiresAt || undefined,
      });
      reset();
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
          <DialogTitle>Yeni Fiyat Alarmı</DialogTitle>
          <DialogDescription>
            Hedef fiyata ulaşıldığında bildirim listenize bir kayıt düşer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <SymbolSearch
            label="Hisse"
            value={symbol}
            error={errors.symbol}
            onSelect={(result) => {
              setSymbol(result.symbol);
              setSymbolName(result.name);
              setErrors((prev) => ({ ...prev, symbol: '' }));
            }}
            onClear={() => {
              setSymbol('');
              setSymbolName('');
            }}
          />

          {quote && quote.price > 0 && (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Güncel fiyat:{' '}
              <Money
                value={quote.price}
                currency={quote.currency}
                price
                className="font-medium text-foreground"
              />
            </p>
          )}

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Koşul</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['ABOVE', 'BELOW'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDirection(value)}
                  aria-pressed={direction === value}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                    direction === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  )}
                >
                  {value === 'ABOVE' ? (
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  )}
                  {value === 'ABOVE' ? 'Üstüne Çıkarsa' : 'Altına İnerse'}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <Label htmlFor="alert-target">Hedef Fiyat</Label>
            <Input
              id="alert-target"
              inputMode="decimal"
              placeholder="Örn. 285,50"
              value={targetPrice}
              onChange={(event) => setTargetPrice(event.target.value)}
              error={errors.targetPrice}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="alert-expiry">Son Geçerlilik Tarihi (İsteğe Bağlı)</Label>
            <Input
              id="alert-expiry"
              type="date"
              min={TODAY_ISO()}
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              error={errors.expiresAt}
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
            <Button type="submit" loading={submitting}>
              Alarmı Kur
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

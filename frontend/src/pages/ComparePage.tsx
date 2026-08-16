import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  GitCompare,
  History,
  Save,
  Share2,
  Star,
  Trash2,
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
import { ShimmerBlock, ShimmerRow } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Money } from '@/components/ui/value';
import { SymbolSearch } from '@/components/SymbolSearch';
import { CompareResultView } from '@/components/compare/CompareResultView';
import {
  useCompare,
  useCompareHistory,
  useDeleteScenario,
  useUpdateScenario,
} from '@/hooks/useQueries';
import { useAuthStore } from '@/stores/authStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  cn,
  formatDate,
  formatNumber,
  subtractMonths,
  subtractYears,
  toISODate,
  TODAY_ISO,
} from '@/lib/utils';
import type { AmountType, CompareResponse, SavedScenario } from '@/types';

const PRESETS = [
  { label: '6 Ay', months: 6 },
  { label: '1 Yıl', months: 12 },
  { label: '3 Yıl', months: 36 },
  { label: '5 Yıl', months: 60 },
] as const;

const MIN_START_DATE = '1990-01-01';

interface FormState {
  symbolA: string;
  symbolAName: string;
  symbolB: string;
  symbolBName: string;
  startDate: string;
  endDate: string;
  amount: string;
  amountType: AmountType;
}

function presetStart(months: number): string {
  const today = new Date();
  return toISODate(months >= 12 ? subtractYears(today, months / 12) : subtractMonths(today, months));
}

export default function ComparePage() {
  useDocumentTitle('Karşılaştır');
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [form, setForm] = useState<FormState>(() => ({
    symbolA: searchParams.get('a') ?? searchParams.get('symbol') ?? '',
    symbolAName: '',
    symbolB: searchParams.get('b') ?? '',
    symbolBName: '',
    startDate: searchParams.get('from') ?? presetStart(12),
    endDate: searchParams.get('to') ?? TODAY_ISO(),
    amount: searchParams.get('amount') ?? '10000',
    amountType: 'MONEY',
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const compare = useCompare();

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }, []);

  const activePreset = useMemo(
    () => PRESETS.find((preset) => presetStart(preset.months) === form.startDate)?.months ?? null,
    [form.startDate]
  );

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!form.symbolA) next.symbolA = 'Bir hisse seçin';
    if (!form.symbolB) next.symbolB = 'Karşılaştırılacak hisseyi seçin';
    if (form.symbolA && form.symbolA === form.symbolB) {
      next.symbolB = 'İki farklı hisse seçin';
    }

    if (!form.startDate) {
      next.startDate = 'Başlangıç tarihi gerekli';
    } else if (form.startDate < MIN_START_DATE) {
      next.startDate = '1990 öncesi için veri bulunmuyor';
    } else if (form.startDate >= form.endDate) {
      next.startDate = 'Başlangıç, bitişten önce olmalı';
    }

    if (form.endDate > TODAY_ISO()) {
      next.endDate = 'Bitiş tarihi bugünden sonra olamaz';
    }

    const amount = Number(form.amount.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      next.amount = form.amountType === 'MONEY' ? 'Geçerli bir tutar girin' : 'Geçerli bir adet girin';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const runCompare = async (options: { save?: boolean; title?: string } = {}) => {
    if (!validate()) return;

    const amount = Number(form.amount.replace(/\./g, '').replace(',', '.'));

    try {
      const response = await compare.mutateAsync({
        symbolA: form.symbolA,
        symbolAName: form.symbolAName || undefined,
        symbolB: form.symbolB,
        symbolBName: form.symbolBName || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        amount,
        amountType: form.amountType,
        title: options.title,
        saveScenario: Boolean(options.save),
      });

      setResult(response);
      setShareUrl(
        response.shareToken ? `${window.location.origin}/s/${response.shareToken}` : null
      );

      // Put the scenario in the URL so a refresh or a back-navigation does not
      // wipe the result the user just produced.
      setSearchParams(
        {
          a: response.symbolA,
          b: response.symbolB,
          from: response.startDate,
          to: response.endDate,
          amount: String(response.amount),
        },
        { replace: true }
      );

      if (options.save) {
        toast.success('Senaryo kaydedildi');
        setSaveOpen(false);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleSwap = () => {
    setForm((current) => ({
      ...current,
      symbolA: current.symbolB,
      symbolAName: current.symbolBName,
      symbolB: current.symbolA,
      symbolBName: current.symbolAName,
    }));
    // The finished result belongs to the old ordering; keeping it on screen
    // next to swapped inputs is how the labels used to end up wrong.
    setResult(null);
    setShareUrl(null);
  };

  const handleCopyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success('Bağlantı kopyalandı');
    } catch {
      toast.error('Bağlantı kopyalanamadı, elle seçip kopyalayabilirsiniz.');
    }
  };

  const loadScenario = (scenario: SavedScenario) => {
    setForm({
      symbolA: scenario.symbolA,
      symbolAName: scenario.symbolAName,
      symbolB: scenario.symbolB,
      symbolBName: scenario.symbolBName,
      startDate: scenario.startDate,
      endDate: scenario.endDate ?? TODAY_ISO(),
      amount: String(scenario.amount),
      amountType: scenario.amountType,
    });

    // The stored result is the answer; re-running it would be five extra
    // requests for a number we already have.
    setResult({
      scenarioId: scenario.id,
      shareToken: scenario.shareToken ?? undefined,
      symbolA: scenario.symbolA,
      symbolAName: scenario.symbolAName,
      symbolB: scenario.symbolB,
      symbolBName: scenario.symbolBName,
      startDate: scenario.startDate,
      endDate: scenario.endDate ?? scenario.startDate,
      amount: scenario.amount,
      amountType: scenario.amountType,
      title: scenario.title ?? undefined,
      result: scenario.result,
    });
    setShareUrl(
      scenario.shareToken ? `${window.location.origin}/s/${scenario.shareToken}` : null
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Karşılaştır"
        description="İki hisseyi geçmişe dönük karşılaştırın: aynı parayı diğerine koysaydınız bugün ne olurdu?"
      />

      <Card>
        <CardContent className="space-y-4 pt-5 sm:pt-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
            <SymbolSearch
              label="Aldığınız Hisse"
              value={form.symbolA}
              error={errors.symbolA}
              onSelect={(item) => {
                setField('symbolA', item.symbol);
                setField('symbolAName', item.name);
              }}
              onClear={() => {
                setField('symbolA', '');
                setField('symbolAName', '');
              }}
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleSwap}
              aria-label="Hisseleri yer değiştir"
              className="mx-auto mb-0.5 hidden md:flex"
              disabled={!form.symbolA && !form.symbolB}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>

            <SymbolSearch
              label="Alabileceğiniz Hisse"
              value={form.symbolB}
              error={errors.symbolB}
              onSelect={(item) => {
                setField('symbolB', item.symbol);
                setField('symbolBName', item.name);
              }}
              onClear={() => {
                setField('symbolB', '');
                setField('symbolBName', '');
              }}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSwap}
            className="w-full md:hidden"
            disabled={!form.symbolA && !form.symbolB}
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
            Yer Değiştir
          </Button>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="compare-start">Başlangıç Tarihi</Label>
              <Input
                id="compare-start"
                type="date"
                min={MIN_START_DATE}
                max={form.endDate}
                value={form.startDate}
                onChange={(event) => setField('startDate', event.target.value)}
                error={errors.startDate}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="compare-end">Bitiş Tarihi</Label>
              <Input
                id="compare-end"
                type="date"
                min={form.startDate}
                max={TODAY_ISO()}
                value={form.endDate}
                onChange={(event) => setField('endDate', event.target.value)}
                error={errors.endDate}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="compare-amount">
                {form.amountType === 'MONEY' ? 'Yatırım Tutarı (₺)' : 'Adet'}
              </Label>
              <Input
                id="compare-amount"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => setField('amount', event.target.value)}
                error={errors.amount}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="compare-amount-type">Hesaplama</Label>
              <Tabs
                value={form.amountType}
                onValueChange={(value) => setField('amountType', value as AmountType)}
                className="mt-1.5"
              >
                <TabsList id="compare-amount-type" className="w-full">
                  <TabsTrigger value="MONEY">Tutar</TabsTrigger>
                  <TabsTrigger value="QUANTITY">Adet</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Hızlı seçim:</span>
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant={activePreset === preset.months ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => {
                  setField('startDate', presetStart(preset.months));
                  setField('endDate', TODAY_ISO());
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button onClick={() => void runCompare()} loading={compare.isPending}>
              <GitCompare className="h-4 w-4" aria-hidden="true" />
              Karşılaştır
            </Button>

            {result && isAuthenticated && !result.scenarioId && (
              <Button variant="outline" onClick={() => setSaveOpen(true)}>
                <Save className="h-4 w-4" aria-hidden="true" />
                Senaryoyu Kaydet
              </Button>
            )}

            {shareUrl && (
              <Button variant="outline" onClick={() => void handleCopyShare()}>
                {copied ? (
                  <Check className="h-4 w-4 text-success" aria-hidden="true" />
                ) : (
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                )}
                {copied ? 'Kopyalandı' : 'Paylaşım Bağlantısı'}
              </Button>
            )}
          </div>

          {shareUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
              <code className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{shareUrl}</code>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void handleCopyShare()}
                aria-label="Bağlantıyı kopyala"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {compare.isPending && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <ShimmerBlock className="h-24 w-full rounded-xl" />
            <div className="grid gap-4 md:grid-cols-2">
              <ShimmerBlock className="h-56 w-full rounded-xl" />
              <ShimmerBlock className="h-56 w-full rounded-xl" />
            </div>
            <ShimmerBlock className="h-[320px] w-full rounded-xl" />
          </CardContent>
        </Card>
      )}

      {!compare.isPending && result && (
        <CompareResultView
          symbolA={result.symbolA}
          symbolAName={result.symbolAName}
          symbolB={result.symbolB}
          symbolBName={result.symbolBName}
          startDate={result.startDate}
          endDate={result.endDate}
          amount={result.amount}
          amountType={result.amountType}
          result={result.result}
        />
      )}

      {!compare.isPending && !result && (
        <Card>
          <EmptyState
            icon={GitCompare}
            title="Karşılaştırmaya Hazır"
            description="İki hisse ve bir tarih aralığı seçin; aynı parayı diğerine koysaydınız bugün ne olacağını hesaplayalım."
          />
        </Card>
      )}

      {isAuthenticated && <ScenarioHistory onLoad={loadScenario} />}

      <SaveScenarioDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        defaultTitle={result ? `${result.symbolA} - ${result.symbolB}` : ''}
        submitting={compare.isPending}
        onSubmit={(title) => runCompare({ save: true, title })}
      />
    </div>
  );
}

// ── Saved scenarios ─────────────────────────────────────────────────────────

function ScenarioHistory({ onLoad }: { onLoad: (scenario: SavedScenario) => void }) {
  const [page, setPage] = useState(0);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SavedScenario | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useCompareHistory(
    page,
    10,
    favoritesOnly
  );
  const updateScenario = useUpdateScenario();
  const deleteScenario = useDeleteScenario();

  const scenarios = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteScenario.mutateAsync(pendingDelete.id);
      toast.success('Senaryo silindi');
      setPendingDelete(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Kayıtlı Senaryolarım
        </CardTitle>

        <Tabs
          value={favoritesOnly ? 'favorites' : 'all'}
          onValueChange={(value) => {
            setFavoritesOnly(value === 'favorites');
            setPage(0);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">Tümü</TabsTrigger>
            <TabsTrigger value="favorites">
              Favoriler{data?.favoriteCount ? ` (${data.favoriteCount})` : ''}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <ShimmerRow key={`scenario-skeleton-${index}`} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} compact />
        ) : scenarios.length === 0 ? (
          <EmptyState
            icon={History}
            compact
            title={favoritesOnly ? 'Favori senaryonuz yok' : 'Henüz senaryo kaydetmediniz'}
            description="Bir karşılaştırma yapıp “Senaryoyu Kaydet” dediğinizde burada birikir ve paylaşabilirsiniz."
          />
        ) : (
          <ul className="space-y-2">
            {scenarios.map((scenario) => {
              const winnerIsB = scenario.result.difference.winnerSymbol === 'B';
              const winner = winnerIsB ? scenario.symbolB : scenario.symbolA;
              const gap = Math.abs(scenario.result.difference.percentagePoints);

              return (
                <li key={scenario.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/40">
                    <button
                      type="button"
                      onClick={() => onLoad(scenario)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-medium">
                        {scenario.title || `${scenario.symbolA} - ${scenario.symbolB}`}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(scenario.startDate)} →{' '}
                        {scenario.endDate ? formatDate(scenario.endDate) : 'bugün'} ·{' '}
                        <Money value={scenario.amount} />
                      </p>
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge variant={winnerIsB ? 'danger' : 'success'} size="sm">
                          {winner} önde
                        </Badge>
                        <p className="mt-1 text-xs text-muted-foreground" data-numeric="">
                          {formatNumber(gap)} puan
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={
                          scenario.isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'
                        }
                        aria-pressed={scenario.isFavorite}
                        onClick={() =>
                          updateScenario.mutate({
                            id: scenario.id,
                            data: { isFavorite: !scenario.isFavorite },
                          })
                        }
                      >
                        <Star
                          className={cn(
                            'h-4 w-4',
                            scenario.isFavorite && 'fill-warning text-warning'
                          )}
                        />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Senaryoyu sil"
                        onClick={() => setPendingDelete(scenario)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <nav className="mt-4 flex items-center justify-between" aria-label="Senaryo sayfaları">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Önceki
            </Button>
            <span className="text-sm text-muted-foreground">
              Sayfa {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((current) => current + 1)}
            >
              Sonraki
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </nav>
        )}
      </CardContent>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Senaryo silinsin mi?"
        description={
          pendingDelete
            ? `“${pendingDelete.title || `${pendingDelete.symbolA} - ${pendingDelete.symbolB}`}” kalıcı olarak silinecek. Varsa paylaşım bağlantısı da çalışmayı bırakır.`
            : ''
        }
        confirmLabel="Sil"
        destructive
        loading={deleteScenario.isPending}
        onConfirm={handleDelete}
      />
    </Card>
  );
}

function SaveScenarioDialog({
  open,
  onOpenChange,
  defaultTitle,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle: string;
  submitting: boolean;
  onSubmit: (title: string) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(defaultTitle);

  useEffect(() => {
    if (open) setTitle(defaultTitle);
  }, [open, defaultTitle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Senaryoyu Kaydet</DialogTitle>
          <DialogDescription>
            Kaydedilen senaryolar geçmişinizde saklanır ve paylaşılabilir bir bağlantı alır.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="scenario-title">Başlık</Label>
          <Input
            id="scenario-title"
            value={title}
            maxLength={255}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Örn. THYAO yerine ASELS alsaydım"
            className="mt-1.5"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button loading={submitting} onClick={() => void onSubmit(title.trim())}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

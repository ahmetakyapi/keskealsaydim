import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowUpDown,
  BellPlus,
  GitCompare,
  LayoutGrid,
  List,
  MoreVertical,
  NotebookPen,
  Plus,
  RefreshCw,
  Search,
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
import { ShimmerTable } from '@/components/ui/skeleton';
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
import { ChangeBadge, Money, UnavailableValue } from '@/components/ui/value';
import { SymbolSearch } from '@/components/SymbolSearch';
import {
  useAddWatchlistItem,
  useRemoveWatchlistItem,
  useUpdateWatchlistItem,
  useWatchlist,
} from '@/hooks/useQueries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn, formatCompact, formatNumber, formatRelativeTime, matchesQuery } from '@/lib/utils';
import type { WatchlistItem } from '@/types';

type SortKey = 'order' | 'changeDesc' | 'changeAsc' | 'symbol';
type ViewMode = 'list' | 'grid';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'order', label: 'Eklenme Sırasına Göre' },
  { value: 'changeDesc', label: 'En Çok Yükselenler' },
  { value: 'changeAsc', label: 'En Çok Düşenler' },
  { value: 'symbol', label: 'Sembole Göre' },
];

export default function WatchlistPage() {
  useDocumentTitle('İzleme Listem');
  const navigate = useNavigate();
  const now = useNow(30_000);

  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useWatchlist();
  const removeItem = useRemoveWatchlistItem();

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('order');
  const [view, setView] = useState<ViewMode>('list');
  const [addOpen, setAddOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState<WatchlistItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WatchlistItem | null>(null);

  const items = useMemo(() => data ?? [], [data]);

  const visibleItems = useMemo(() => {
    const filtered = items.filter(
      (item) => matchesQuery(item.symbol, query) || matchesQuery(item.symbolName, query)
    );

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'changeDesc':
          return b.changePercent - a.changePercent;
        case 'changeAsc':
          return a.changePercent - b.changePercent;
        case 'symbol':
          return a.symbol.localeCompare(b.symbol, 'tr');
        default:
          return a.displayOrder - b.displayOrder;
      }
    });
  }, [items, query, sortKey]);

  // Leaders are computed from the priced subset of what is on screen, so the
  // headline never disagrees with the list beneath it.
  const { leader, laggard } = useMemo(() => {
    const priced = visibleItems.filter((item) => item.priceAvailable);
    if (priced.length === 0) return { leader: null, laggard: null };

    const sorted = [...priced].sort((a, b) => b.changePercent - a.changePercent);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];

    return {
      leader: top.changePercent > 0 ? top : null,
      laggard: bottom.changePercent < 0 && bottom.id !== top.id ? bottom : null,
    };
  }, [visibleItems]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await removeItem.mutateAsync(pendingDelete.id);
      toast.success(`${pendingDelete.symbol} listeden çıkarıldı`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="İzleme Listem"
        description="Takip ettiğiniz hisselerin güncel fiyatları. Liste dakikada bir kendini yeniler."
        meta={
          data && (
            <span className="text-xs text-muted-foreground">
              Son güncelleme: {formatRelativeTime(new Date(dataUpdatedAt), now)}
            </span>
          )
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              loading={isFetching && !isLoading}
            >
              {!(isFetching && !isLoading) && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              Yenile
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Hisse Ekle
            </Button>
          </>
        }
      />

      {(leader || laggard) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {leader && (
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Günün Lideri</p>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <span className="text-lg font-semibold">{leader.symbol}</span>
                <ChangeBadge value={leader.changePercent} />
              </div>
            </Card>
          )}
          {laggard && (
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Günün Zayıf Halkası</p>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <span className="text-lg font-semibold">{laggard.symbol}</span>
                <ChangeBadge value={laggard.changePercent} />
              </div>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>
            {items.length} Hisse
            {query && visibleItems.length !== items.length && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({visibleItems.length} eşleşme)
              </span>
            )}
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-48">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Listede ara"
                aria-label="İzleme listesinde ara"
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

            <div className="flex rounded-lg border border-border p-0.5">
              <Button
                variant={view === 'list' ? 'subtle' : 'ghost'}
                size="icon-sm"
                onClick={() => setView('list')}
                aria-label="Liste görünümü"
                aria-pressed={view === 'list'}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'grid' ? 'subtle' : 'ghost'}
                size="icon-sm"
                onClick={() => setView('grid')}
                aria-label="Kart görünümü"
                aria-pressed={view === 'grid'}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <ShimmerTable rows={5} />
          ) : isError ? (
            <ErrorState
              error={error}
              title="İzleme listesi yüklenemedi"
              onRetry={() => void refetch()}
              retrying={isFetching}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Star}
              title="İzleme listeniz boş"
              description="Takip etmek istediğiniz hisseleri ekleyin; fiyatları, günlük değişimlerini ve 52 haftalık aralıklarını tek ekranda görün."
              actionLabel="Hisse Ekle"
              onAction={() => setAddOpen(true)}
              secondaryLabel="Piyasaya Göz At"
              onSecondary={() => navigate('/market')}
            />
          ) : visibleItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              “{query}” için sonuç bulunamadı.
            </p>
          ) : view === 'list' ? (
            <ul className="space-y-2">
              {visibleItems.map((item) => (
                <WatchRow
                  key={item.id}
                  item={item}
                  onOpen={() => navigate(`/stocks/${encodeURIComponent(item.symbol)}`)}
                  onCompare={() => navigate(`/compare?a=${encodeURIComponent(item.symbol)}`)}
                  onAlert={() => navigate(`/alerts?symbol=${encodeURIComponent(item.symbol)}`)}
                  onAddToPortfolio={() =>
                    navigate(`/portfolio?add=${encodeURIComponent(item.symbol)}`)
                  }
                  onEditNotes={() => setEditingNotes(item)}
                  onDelete={() => setPendingDelete(item)}
                />
              ))}
            </ul>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((item) => (
                <WatchCard
                  key={item.id}
                  item={item}
                  onOpen={() => navigate(`/stocks/${encodeURIComponent(item.symbol)}`)}
                  onDelete={() => setPendingDelete(item)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddWatchDialog open={addOpen} onOpenChange={setAddOpen} existing={items} />
      <NotesDialog item={editingNotes} onClose={() => setEditingNotes(null)} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Listeden çıkarılsın mı?"
        description={
          pendingDelete
            ? `${pendingDelete.symbol} izleme listenizden kaldırılacak. Portföyünüzdeki pozisyonlar etkilenmez.`
            : ''
        }
        confirmLabel="Çıkar"
        destructive
        loading={removeItem.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ── Rows ────────────────────────────────────────────────────────────────────

function rangePosition(item: WatchlistItem): number | null {
  if (!item.priceAvailable) return null;
  const span = item.week52High - item.week52Low;
  if (span <= 0) return null;
  return Math.min(100, Math.max(0, ((item.price - item.week52Low) / span) * 100));
}

function WatchRow({
  item,
  onOpen,
  onCompare,
  onAlert,
  onAddToPortfolio,
  onEditNotes,
  onDelete,
}: {
  item: WatchlistItem;
  onOpen: () => void;
  onCompare: () => void;
  onAlert: () => void;
  onAddToPortfolio: () => void;
  onEditNotes: () => void;
  onDelete: () => void;
}) {
  const position = rangePosition(item);

  return (
    <li className="rounded-xl border border-border p-3 transition-colors hover:border-primary/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{item.symbol}</span>
            {item.currency && item.currency !== 'TRY' && (
              <Badge variant="outline" size="sm">
                {item.currency}
              </Badge>
            )}
          </div>
          {item.symbolName !== item.symbol && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.symbolName}</p>
          )}
          {item.notes && (
            <p className="mt-1 truncate text-xs italic text-muted-foreground">“{item.notes}”</p>
          )}
        </button>

        <div className="flex items-center gap-4">
          <div className="text-right">
            {item.priceAvailable ? (
              <>
                <Money
                  value={item.price}
                  currency={item.currency}
                  price
                  className="block text-sm font-semibold"
                />
                <span className="text-[11px] text-muted-foreground" data-numeric="">
                  hacim {item.volume > 0 ? formatCompact(item.volume) : '—'}
                </span>
              </>
            ) : (
              <UnavailableValue />
            )}
          </div>

          {item.priceAvailable && (
            <ChangeBadge value={item.changePercent} amount={item.change} currency={item.currency} />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`${item.symbol} işlemleri`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onOpen}>Detayı Aç</DropdownMenuItem>
              <DropdownMenuItem onSelect={onCompare}>
                <GitCompare className="h-4 w-4" aria-hidden="true" />
                Karşılaştır
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onAlert}>
                <BellPlus className="h-4 w-4" aria-hidden="true" />
                Fiyat Alarmı Kur
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onAddToPortfolio}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Portföye Ekle
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onEditNotes}>
                <NotebookPen className="h-4 w-4" aria-hidden="true" />
                {item.notes ? 'Notu Düzenle' : 'Not Ekle'}
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={onDelete}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Listeden Çıkar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {position !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span data-numeric="">{formatNumber(item.week52Low)}</span>
            <span>52 haftalık aralık</span>
            <span data-numeric="">{formatNumber(item.week52High)}</span>
          </div>
          <div className="relative mt-1 h-1.5 w-full rounded-full bg-muted">
            <span
              className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-primary"
              style={{ left: `${position}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </li>
  );
}

function WatchCard({
  item,
  onOpen,
  onDelete,
}: {
  item: WatchlistItem;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="group relative p-4" interactive>
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{item.symbol}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.symbolName}</p>
          </div>
        </div>

        <div className="mt-4">
          {item.priceAvailable ? (
            <>
              <Money
                value={item.price}
                currency={item.currency}
                price
                className="text-xl font-semibold"
              />
              <div className="mt-2">
                <ChangeBadge value={item.changePercent} size="sm" />
              </div>
            </>
          ) : (
            <UnavailableValue label="Fiyat verisi alınamadı" />
          )}
        </div>
      </button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        aria-label={`${item.symbol} hissesini listeden çıkar`}
        // Always reachable by keyboard; only the hover reveal is decorative.
        className="absolute right-2 top-2 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </Card>
  );
}

// ── Dialogs ─────────────────────────────────────────────────────────────────

function AddWatchDialog({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: WatchlistItem[];
}) {
  const addItem = useAddWatchlistItem();
  const [symbol, setSymbol] = useState('');
  const [symbolName, setSymbolName] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const alreadyAdded = existing.some(
    (item) => item.symbol.toUpperCase() === symbol.toUpperCase().replace(/\.IS$/, '')
  );

  const reset = () => {
    setSymbol('');
    setSymbolName('');
    setNotes('');
    setFormError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!symbol) {
      setFormError('Bir hisse seçin');
      return;
    }
    if (alreadyAdded) {
      setFormError('Bu hisse zaten listenizde');
      return;
    }

    try {
      await addItem.mutateAsync({ symbol, symbolName, notes: notes || undefined });
      toast.success(`${symbol} izleme listesine eklendi`);
      reset();
      onOpenChange(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hisse Ekle</DialogTitle>
          <DialogDescription>
            Listeden seçin. Fiyat verisi bulunamayan semboller eklenemez.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <SymbolSearch
            label="Hisse"
            value={symbol}
            error={alreadyAdded ? 'Bu hisse zaten listenizde' : undefined}
            onSelect={(item) => {
              setSymbol(item.symbol);
              setSymbolName(item.name);
              setFormError('');
            }}
            onClear={() => {
              setSymbol('');
              setSymbolName('');
            }}
          />

          <div>
            <Label htmlFor="watch-notes">Not (İsteğe Bağlı)</Label>
            <Input
              id="watch-notes"
              value={notes}
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Neden takip ediyorsunuz?"
              className="mt-1.5"
            />
          </div>

          {formError && !alreadyAdded && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Vazgeç
            </Button>
            <Button type="submit" loading={addItem.isPending} disabled={alreadyAdded}>
              Ekle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NotesDialog({ item, onClose }: { item: WatchlistItem | null; onClose: () => void }) {
  const updateItem = useUpdateWatchlistItem();
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setNotes(item?.notes ?? '');
    setFormError('');
  }, [item]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!item) return;

    try {
      await updateItem.mutateAsync({ id: item.id, data: { notes } });
      toast.success('Not kaydedildi');
      onClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item?.symbol} Notu</DialogTitle>
          <DialogDescription>
            Bu hisseyi neden takip ettiğinizi not edin; listede görünür.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="notes-field">Not</Label>
            <textarea
              id="notes-field"
              value={notes}
              maxLength={500}
              rows={4}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1.5 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              placeholder="Örn. 250 TL altına inerse almayı düşünüyorum."
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{notes.length}/500</p>
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
            <Button type="submit" loading={updateItem.isPending}>
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

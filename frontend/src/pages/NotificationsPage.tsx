import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bell,
  BellRing,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { ShimmerRow } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useDeleteNotification,
  useMarkNotificationsRead,
  useNotifications,
} from '@/hooks/useQueries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { AppNotification, NotificationType } from '@/types';

const TYPE_META: Record<NotificationType, { label: string; icon: typeof Bell; tone: string }> = {
  PRICE_ALERT: { label: 'Fiyat Alarmı', icon: BellRing, tone: 'text-warning bg-warning/12' },
  PORTFOLIO_UPDATE: { label: 'Portföy', icon: Wallet, tone: 'text-primary bg-primary/12' },
  COMPARISON_RESULT: { label: 'Karşılaştırma', icon: TrendingUp, tone: 'text-secondary bg-secondary/12' },
  NEWS: { label: 'Haber', icon: Newspaper, tone: 'text-muted-foreground bg-muted' },
  SYSTEM: { label: 'Sistem', icon: Bell, tone: 'text-muted-foreground bg-muted' },
};

/** Pulls the symbol out of a price-alert payload so the row can link to it. */
function symbolOf(notification: AppNotification): string | null {
  const symbol = notification.data?.symbol;
  return typeof symbol === 'string' && symbol.length > 0 ? symbol : null;
}

export default function NotificationsPage() {
  useDocumentTitle('Bildirimler');
  const navigate = useNavigate();
  const now = useNow(30_000);

  const [page, setPage] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useNotifications(page, unreadOnly);
  const markRead = useMarkNotificationsRead();
  const removeNotification = useDeleteNotification();

  const notifications = data?.content ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const handleMarkAll = async () => {
    try {
      await markRead.mutateAsync(undefined);
      toast.success('Tüm bildirimler okundu olarak işaretlendi');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleClearAll = async () => {
    try {
      await removeNotification.mutateAsync(undefined);
      setClearOpen(false);
      setPage(0);
      toast.success('Bildirimler temizlendi');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleOpen = async (notification: AppNotification) => {
    if (!notification.isRead) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        // Reading is best-effort; navigation should still happen.
      }
    }
    const symbol = symbolOf(notification);
    if (symbol) navigate(`/stocks/${encodeURIComponent(symbol)}`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bildirimler"
        description="Fiyat alarmlarınız tetiklendiğinde ve portföyünüzle ilgili gelişmelerde burada haber alırsınız."
        meta={
          unreadCount > 0 ? (
            <Badge variant="danger">{unreadCount} okunmamış</Badge>
          ) : (
            <Badge variant="neutral">Hepsi okundu</Badge>
          )
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleMarkAll()}
              disabled={unreadCount === 0}
              loading={markRead.isPending}
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Tümünü Okundu İşaretle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setClearOpen(true)}
              disabled={notifications.length === 0}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Temizle
            </Button>
          </>
        }
      />

      <Tabs
        value={unreadOnly ? 'unread' : 'all'}
        onValueChange={(value) => {
          setUnreadOnly(value === 'unread');
          setPage(0);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">Tümü</TabsTrigger>
          <TabsTrigger value="unread">Okunmamış{unreadCount > 0 ? ` (${unreadCount})` : ''}</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <ShimmerRow key={`notification-skeleton-${index}`} />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bell}
            title={unreadOnly ? 'Okunmamış bildirim yok' : 'Henüz bildirim yok'}
            description={
              unreadOnly
                ? 'Tüm bildirimlerinizi okumuşsunuz.'
                : 'Bir hisse için fiyat alarmı kurduğunuzda, hedef fiyata ulaşıldığında burada bildirim görürsünüz.'
            }
            actionLabel={unreadOnly ? undefined : 'Fiyat Alarmı Kur'}
            onAction={unreadOnly ? undefined : () => navigate('/alerts')}
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const meta = TYPE_META[notification.type] ?? TYPE_META.SYSTEM;
            const Icon = meta.icon;
            const symbol = symbolOf(notification);

            return (
              <li key={notification.id}>
                <Card
                  className={cn(
                    'flex items-start gap-3 p-4',
                    !notification.isRead && 'border-primary/25 bg-primary/[0.04]'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                      meta.tone
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      {!notification.isRead && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          aria-label="Okunmadı"
                        />
                      )}
                      <Badge variant="outline" size="sm">
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      <time dateTime={notification.createdAt}>
                        {formatRelativeTime(notification.createdAt, now)}
                      </time>
                    </p>

                    {symbol && (
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-1 h-auto p-0"
                        onClick={() => void handleOpen(notification)}
                      >
                        {symbol} detayına git
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Okundu işaretle"
                        onClick={() => markRead.mutate(notification.id)}
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${notification.title} bildirimini sil`}
                      onClick={() => removeNotification.mutate(notification.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between" aria-label="Bildirim sayfaları">
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

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Tüm bildirimler silinsin mi?"
        description="Bu işlem geri alınamaz. Okunmuş ve okunmamış tüm bildirimleriniz kalıcı olarak silinir."
        confirmLabel="Tümünü Sil"
        destructive
        loading={removeNotification.isPending}
        onConfirm={handleClearAll}
      />
    </div>
  );
}

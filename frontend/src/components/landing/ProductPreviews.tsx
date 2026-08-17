import { ArrowDownRight, ArrowUpRight, BellRing, Check, Copy, Eye, Link2, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

/**
 * Miniature renderings of real app screens, for the feature showcase.
 *
 * These are built from the same tokens and the same layout rules as the real
 * screens rather than being screenshots: they stay correct in both themes,
 * they scale with the type system, and they cannot drift out of date the way
 * an exported PNG does. The figures are illustrative and labelled as such by
 * the surrounding copy — no live account data is implied.
 */

function Chrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
      <div className="flex items-center gap-2 border-b border-border bg-surface-raised/60 px-3 py-2">
        <span className="flex gap-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Row({
  symbol,
  name,
  value,
  percent,
}: {
  symbol: string;
  name: string;
  value: number;
  percent: number;
}) {
  const up = percent >= 0;
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block text-xs font-semibold">{symbol}</span>
        <span className="block truncate text-[10px] text-muted-foreground">{name}</span>
      </span>
      <span className="text-right">
        <span className="block text-xs font-semibold" data-numeric="">
          {formatCurrency(value)}
        </span>
        <span
          className={cn(
            'flex items-center justify-end gap-0.5 text-[10px] font-medium',
            up ? 'text-success' : 'text-danger'
          )}
          data-numeric=""
        >
          {up ? (
            <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
          ) : (
            <ArrowDownRight className="h-2.5 w-2.5" aria-hidden="true" />
          )}
          %{formatNumber(Math.abs(percent))}
        </span>
      </span>
    </li>
  );
}

export function PortfolioPreview() {
  return (
    <Chrome title="Portföyüm">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted p-2">
          <p className="text-[10px] text-muted-foreground">Toplam Değer</p>
          <p className="mt-0.5 text-sm font-semibold" data-numeric="">
            {formatCurrency(76249.46)}
          </p>
        </div>
        <div className="rounded-lg bg-success/10 p-2">
          <p className="text-[10px] text-muted-foreground">Kâr / Zarar</p>
          <p className="mt-0.5 text-sm font-semibold text-success" data-numeric="">
            +{formatCurrency(30670.07)}
          </p>
        </div>
      </div>
      <ul className="divide-y divide-border">
        <Row symbol="AAPL" name="Apple Inc." value={73196.96} percent={12.4} />
        <Row symbol="THYAO" name="Türk Hava Yolları" value={3052.5} percent={-1.2} />
        <Row symbol="ASELS" name="Aselsan" value={18740.0} percent={8.9} />
      </ul>
      <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Wallet className="h-2.5 w-2.5" aria-hidden="true" />
        Yabancı hisseler günlük kurla TL'ye çevrilir
      </p>
    </Chrome>
  );
}

export function AlertPreview() {
  return (
    <Chrome title="Fiyat Alarmları">
      <ul className="space-y-2">
        {[
          { symbol: 'THYAO', target: 320, current: 305.25, status: 'Aktif', hit: false },
          { symbol: 'ASELS', target: 180, current: 188.9, status: 'Tetiklendi', hit: true },
        ].map((alert) => (
          <li
            key={alert.symbol}
            className={cn(
              'rounded-lg border p-2.5',
              alert.hit ? 'border-success/30 bg-success/[0.06]' : 'border-border'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">{alert.symbol}</span>
              <Badge variant={alert.hit ? 'success' : 'default'} size="sm">
                {alert.status}
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
              <BellRing className="h-2.5 w-2.5" aria-hidden="true" />
              Hedef {formatNumber(alert.target)} · Güncel {formatNumber(alert.current)}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-2 rounded-lg bg-muted p-2">
        <p className="text-[10px] font-medium">ASELS Fiyat Alarmı</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Aselsan belirlediğiniz üst sınıra ulaştı.
        </p>
      </div>
    </Chrome>
  );
}

export function ComparePreview() {
  return (
    <Chrome title="Karşılaştır">
      <div className="rounded-lg border border-danger/25 bg-danger/[0.06] p-2.5">
        <p className="text-[10px] text-muted-foreground">3 yıl önce {formatCurrency(10000)} ile</p>
        <p className="mt-1 text-sm font-semibold leading-snug">
          <span className="text-danger">ASELS</span> alsaydınız{' '}
          <span data-numeric="">{formatCurrency(93169.4)}</span> daha fazlanız olurdu.
        </p>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Oynaklık', value: '%42,1' },
          { label: 'Korelasyon', value: '0,31' },
          { label: 'En Sert Düşüş', value: '%22,5' },
        ].map((metric) => (
          <div key={metric.label} className="rounded-lg bg-muted p-1.5">
            <p className="text-[9px] text-muted-foreground">{metric.label}</p>
            <p className="text-[11px] font-semibold" data-numeric="">
              {metric.value}
            </p>
          </div>
        ))}
      </div>
      {/* Illustrative sparkline: two diverging paths, drawn not fetched. */}
      <svg viewBox="0 0 200 48" className="mt-2 h-12 w-full" aria-hidden="true">
        <path
          d="M0 40 L30 38 L60 36 L90 33 L120 31 L150 28 L200 26"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
        />
        <path
          d="M0 42 L30 39 L60 32 L90 26 L120 18 L150 10 L200 4"
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth="2"
        />
      </svg>
    </Chrome>
  );
}

export function SharePreview() {
  return (
    <Chrome title="Paylaşılan Senaryo">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-2 py-1.5">
        <Link2 className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <code className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
          keskealsaydim.vercel.app/s/8f3a…
        </code>
        <Copy className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="mt-2.5 rounded-lg border border-border p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold">THYAO - ASELS</p>
          <Badge variant="neutral" size="sm">
            <Eye className="h-2.5 w-2.5" aria-hidden="true" />
            142
          </Badge>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Alıcı hesap açmadan sonucu görebilir.
        </p>
      </div>

      <ul className="mt-2 space-y-1">
        {['Genel bağlantı', 'Görüntülenme sayısı', 'İstediğinizde silme'].map((item) => (
          <li key={item} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Check className="h-2.5 w-2.5 text-success" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </Chrome>
  );
}

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Check, GitCompare, Share2, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn, EASE_BRAND } from '@/lib/utils';
import { AlertPreview, ComparePreview, PortfolioPreview, SharePreview } from './ProductPreviews';

/**
 * Feature showcase: pick a capability on the left, see that screen on the
 * right. Chosen over a grid of four static cards because the point is to
 * show the product, and a grid can only describe it.
 */

const FEATURES = [
  {
    id: 'compare',
    icon: GitCompare,
    title: 'Gerçek Fiyatlarla Karşılaştırma',
    description:
      'İki hisseyi seçtiğiniz aralıkta gün gün karşılaştırın. Yabancı hisseler her işlem gününün kuruyla Türk lirasına çevrilir — bugünkü kurla toptan çevirmek yanlış sonuç verirdi.',
    points: ['Günlük Kurla TL Çevrimi', 'Oynaklık ve Korelasyon', 'En Sert Düşüş'],
    visual: <ComparePreview />,
  },
  {
    id: 'portfolio',
    icon: Wallet,
    title: 'Portföy Takibi',
    description:
      'Komisyonuyla birlikte alış kaydedin. Güncel değer, ağırlık, günlük değişim ve satış sonrası gerçekleşen kâr tek ekranda toplanır.',
    points: ['Kısmi ve Tam Satış', 'Dağılım Grafiği', 'CSV Dışa Aktarma'],
    visual: <PortfolioPreview />,
  },
  {
    id: 'alerts',
    icon: BellRing,
    title: 'Fiyat Alarmları',
    description:
      'Bir hisse belirlediğiniz seviyeye ulaştığında bildirim listenize düşsün. Alarmlar ekranı her açtığınızda güncel fiyatla değerlendirilir.',
    points: ['Üst ve Alt Sınır', 'Bildirim Gelen Kutusu', 'Süreli Alarm'],
    visual: <AlertPreview />,
  },
  {
    id: 'share',
    icon: Share2,
    title: 'Paylaşılabilir Senaryolar',
    description:
      'Hesapladığınız senaryoyu kaydedin, bağlantısını paylaşın. Karşı taraf hesap açmadan aynı sonucu görür.',
    points: ['Genel Bağlantı', 'Görüntülenme Sayısı', 'Favorilere Ekleme'],
    visual: <SharePreview />,
  },
] as const;

export function FeatureShowcase() {
  const reduced = usePrefersReducedMotion();
  const [activeId, setActiveId] = useState<string>(FEATURES[0].id);
  const active = FEATURES.find((feature) => feature.id === activeId) ?? FEATURES[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-10">
      {/* Selector */}
      <div className="space-y-2.5" role="tablist" aria-label="Özellikler">
        {FEATURES.map((feature) => {
          const isActive = feature.id === active.id;
          return (
            <button
              key={feature.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`feature-panel-${feature.id}`}
              id={`feature-tab-${feature.id}`}
              onClick={() => setActiveId(feature.id)}
              className={cn(
                'relative w-full rounded-2xl border p-4 text-left transition-all sm:p-5',
                isActive
                  ? 'border-primary/35 bg-primary/[0.06] shadow-md'
                  : 'border-border bg-card hover:border-primary/20 hover:bg-accent/40'
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                    isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <feature.icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>

                <div className="min-w-0">
                  <h3 className="display-sm text-base">{feature.title}</h3>

                  {/* The body copy and bullets only matter for the open item;
                      keeping them collapsed keeps the list scannable. */}
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.div
                        initial={reduced ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={reduced ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: EASE_BRAND }}
                        className="overflow-hidden"
                      >
                        <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                          {feature.points.map((point) => (
                            <li
                              key={point}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground"
                            >
                              <Check className="h-3 w-3 shrink-0 text-success" aria-hidden="true" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {isActive && !reduced && (
                <motion.span
                  layoutId="feature-active-rail"
                  className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-primary"
                  transition={{ duration: 0.35, ease: EASE_BRAND }}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative">
          <div className="bloom -inset-4 h-full w-full bg-secondary/12" aria-hidden="true" />
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              id={`feature-panel-${active.id}`}
              role="tabpanel"
              aria-labelledby={`feature-tab-${active.id}`}
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -14 }}
              transition={{ duration: 0.32, ease: EASE_BRAND }}
              className="relative"
            >
              <Card className="overflow-hidden border-border/70 p-3 shadow-xl">
                {active.visual}
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

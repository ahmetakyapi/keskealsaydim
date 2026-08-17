import { useState } from 'react';
import { motion } from 'framer-motion';
import { BellRing, Check, GitCompare, Share2, Wallet } from 'lucide-react';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn, EASE_BRAND } from '@/lib/utils';
import { AlertPreview, ComparePreview, PortfolioPreview, SharePreview } from './ProductPreviews';

/**
 * Feature showcase: pick a capability on the left, see that screen on the
 * right. Chosen over a grid of static cards because the point is to show the
 * product, and a grid can only describe it.
 *
 * Layout stability is the whole design constraint here. The first version
 * shook the page on every selection, for two reasons, both now removed:
 *
 *   1. The description collapsed with `height: 0 → auto`, so the left column
 *      changed height and everything below it jumped. Now every item shows
 *      its full body copy at all times — the selected state is carried by
 *      the border, the tint and the rail, none of which affect layout.
 *   2. The right panel used `AnimatePresence mode="wait"`, which unmounts the
 *      old preview before mounting the new one; for a frame the container
 *      collapsed to nothing. Now both live in a fixed-height grid cell,
 *      stacked, and only opacity crossfades — nothing reflows.
 */

const FEATURES = [
  {
    id: 'compare',
    icon: GitCompare,
    title: 'Gerçek Fiyatlarla Karşılaştırma',
    description:
      'İki hisseyi seçtiğiniz aralıkta gün gün karşılaştırın. Yabancı hisseler her işlem gününün kuruyla Türk lirasına çevrilir.',
    points: ['Günlük Kurla TL Çevrimi', 'Oynaklık ve Korelasyon', 'En Sert Düşüş'],
    visual: <ComparePreview />,
  },
  {
    id: 'portfolio',
    icon: Wallet,
    title: 'Portföy Takibi',
    description:
      'Komisyonuyla birlikte alış kaydedin. Güncel değer, ağırlık ve satış sonrası gerçekleşen kâr tek ekranda toplanır.',
    points: ['Kısmi ve Tam Satış', 'Dağılım Grafiği', 'CSV Dışa Aktarma'],
    visual: <PortfolioPreview />,
  },
  {
    id: 'alerts',
    icon: BellRing,
    title: 'Fiyat Alarmları',
    description:
      'Bir hisse belirlediğiniz seviyeye ulaştığında bildirim listenize düşsün. Alarmlar ekranı her açtığınızda değerlendirilir.',
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-start lg:gap-10">
      {/* Selector — every item keeps its height, so nothing below moves. */}
      <div className="space-y-2.5" role="tablist" aria-label="Özellikler">
        {FEATURES.map((feature) => {
          const isActive = feature.id === activeId;
          return (
            <button
              key={feature.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`feature-panel-${feature.id}`}
              id={`feature-tab-${feature.id}`}
              onClick={() => setActiveId(feature.id)}
              onMouseEnter={() => setActiveId(feature.id)}
              className={cn(
                'relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-colors duration-300 sm:p-5',
                isActive
                  ? 'border-primary/35 bg-primary/[0.06]'
                  : 'border-border bg-card hover:border-primary/20'
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300',
                    isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <feature.icon className="h-4 w-4" aria-hidden="true" />
                </span>

                <div className="min-w-0">
                  <h3 className="display-sm text-base">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>

                  <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                    {feature.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <Check
                          className={cn(
                            'h-3 w-3 shrink-0 transition-colors duration-300',
                            isActive ? 'text-success' : 'text-muted-foreground/50'
                          )}
                          aria-hidden="true"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Sliding rail. `layoutId` moves it between items instead of
                  fading one out and another in. */}
              {isActive &&
                (reduced ? (
                  <span
                    className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                ) : (
                  <motion.span
                    layoutId="feature-active-rail"
                    className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-primary"
                    transition={{ duration: 0.3, ease: EASE_BRAND }}
                    aria-hidden="true"
                  />
                ))}
            </button>
          );
        })}
      </div>

      {/*
        Panel. All four previews are mounted and stacked in one grid cell, so
        the cell is always as tall as the tallest one and switching never
        changes the page height. Only the active one is visible and reachable.
      */}
      <div className="lg:sticky lg:top-24">
        <div className="relative">
          <div className="bloom -inset-4 h-full w-full bg-secondary/12" aria-hidden="true" />

          <div className="relative grid">
            {FEATURES.map((feature) => {
              const isActive = feature.id === activeId;
              return (
                <motion.div
                  key={feature.id}
                  id={`feature-panel-${feature.id}`}
                  role="tabpanel"
                  aria-labelledby={`feature-tab-${feature.id}`}
                  aria-hidden={!isActive}
                  // Every panel occupies the same grid area; the tallest one
                  // sets the height once and it never changes again.
                  className={cn(
                    'col-start-1 row-start-1 rounded-2xl border border-border bg-card p-3 shadow-xl',
                    !isActive && 'pointer-events-none'
                  )}
                  initial={false}
                  animate={{ opacity: isActive ? 1 : 0 }}
                  transition={{ duration: reduced ? 0 : 0.28, ease: EASE_BRAND }}
                >
                  {feature.visual}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

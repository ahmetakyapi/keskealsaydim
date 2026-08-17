import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { RevealGroup, RevealItem } from '@/components/Motion';
import { subtractYears, toISODate, TODAY_ISO } from '@/lib/utils';

/**
 * Prefilled entry points into the comparison screen.
 *
 * Every card is a plain link carrying its parameters in the URL — no extra
 * API calls to render this section, and the result the visitor lands on is
 * computed live rather than being a stored claim about the outcome.
 */

const PAIRS = [
  { a: 'THYAO', b: 'ASELS', label: 'Türk Hava Yolları / Aselsan', years: 3 },
  { a: 'GARAN', b: 'BIMAS', label: 'Garanti BBVA / BİM', years: 3 },
  { a: 'EREGL', b: 'TUPRS', label: 'Ereğli / Tüpraş', years: 5 },
  { a: 'THYAO', b: 'NVDA', label: 'Türk Hava Yolları / NVIDIA', years: 3 },
  { a: 'SISE', b: 'SAHOL', label: 'Şişecam / Sabancı Holding', years: 5 },
  { a: 'TCELL', b: 'TTKOM', label: 'Turkcell / Türk Telekom', years: 3 },
] as const;

export function PopularComparisons() {
  return (
    <RevealGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
      {PAIRS.map((pair) => {
        const params = new URLSearchParams({
          a: pair.a,
          b: pair.b,
          from: toISODate(subtractYears(new Date(), pair.years)),
          to: TODAY_ISO(),
          amount: '10000',
        });

        return (
          <RevealItem key={`${pair.a}-${pair.b}`}>
            <Card
              interactive
              className="group h-full transition-transform hover:-translate-y-0.5"
            >
              <Link
                to={`/compare?${params.toString()}`}
                className="flex h-full items-center justify-between gap-3 p-4"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-semibold">
                    {pair.a}
                    <span className="text-xs font-normal text-muted-foreground">yerine</span>
                    {pair.b}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {pair.label} · {pair.years} yıl
                  </span>
                </span>

                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </Link>
            </Card>
          </RevealItem>
        );
      })}
    </RevealGroup>
  );
}

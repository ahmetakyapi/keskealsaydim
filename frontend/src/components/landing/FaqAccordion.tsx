import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaqItem {
  q: string;
  a: string;
}

/**
 * FAQ built on native `<details>`/`<summary>`.
 *
 * Chosen over a JS accordion on purpose: it is keyboard operable, announced
 * correctly by screen readers and searchable by the browser's find-in-page
 * without a line of state management — and it works before hydration.
 */
export function FaqAccordion({ items, className }: { items: readonly FaqItem[]; className?: string }) {
  return (
    <div className={cn('divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card', className)}>
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary
            className={cn(
              'flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition-colors',
              'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              // Safari still paints the default disclosure marker otherwise.
              '[&::-webkit-details-marker]:hidden'
            )}
          >
            <span className="display-sm text-base">{item.q}</span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>

          <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

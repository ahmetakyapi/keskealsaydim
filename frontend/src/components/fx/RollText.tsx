import { cn } from '@/lib/utils';

/**
 * Hover "roll": the label slides up and an identical copy rolls in from
 * below. Needs a `group` ancestor (the link or button it sits in).
 */
export function RollText({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn('relative inline-flex overflow-hidden', className)}>
      <span className="block transition-transform duration-500 ease-brand group-hover:-translate-y-full motion-reduce:transition-none">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="absolute left-0 top-full block transition-transform duration-500 ease-brand group-hover:-translate-y-full motion-reduce:transition-none"
      >
        {children}
      </span>
    </span>
  );
}

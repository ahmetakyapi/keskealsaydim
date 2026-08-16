import { cn } from '@/lib/utils';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const MARK_SIZE = {
  sm: 'h-8 w-8 rounded-[10px] text-sm',
  md: 'h-10 w-10 rounded-xl text-base',
  lg: 'h-14 w-14 rounded-2xl text-2xl',
} as const;

const TEXT_SIZE = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
} as const;

/**
 * Word mark. The letter is solid, not gradient-filled: the previous version
 * used `-webkit-text-fill-color: transparent`, which renders invisible where
 * background-clip is unsupported and is a house rule violation besides.
 */
export function BrandLogo({ size = 'md', showText = true, className }: Readonly<BrandLogoProps>) {
  const mark = (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center border border-primary/35 bg-primary/15 font-bold text-primary',
        MARK_SIZE[size]
      )}
    >
      K
    </span>
  );

  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      {mark}
      {showText && (
        <span className={cn('font-semibold tracking-tight text-foreground', TEXT_SIZE[size])}>
          Keşke <span className="text-primary">Alsaydım</span>
        </span>
      )}
      {!showText && <span className="sr-only">Keşke Alsaydım</span>}
    </span>
  );
}

import { cn } from '@/lib/utils';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  markClassName?: string;
  textClassName?: string;
}

const markSizeClass = {
  sm: 'h-9 w-9 p-1',
  md: 'h-10 w-10 p-1',
  lg: 'h-12 w-12 p-[5px]',
};

const textSizeClass = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function BrandLogo({
  size = 'md',
  showText = true,
  className,
  markClassName,
  textClassName,
}: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_18px_38px_rgba(6,12,18,0.22)]',
          markSizeClass[size],
          markClassName
        )}
      >
        <img
          src="/logo-icon-512.png"
          alt={showText ? '' : 'Keşke Alsaydım'}
          aria-hidden={showText}
          className="h-full w-full rounded-xl object-cover"
        />
      </span>
      {showText && (
        <span className={cn('font-semibold tracking-tight text-white', textSizeClass[size], textClassName)}>
          Keşke <span className="text-primary">Alsaydım</span>
        </span>
      )}
    </div>
  );
}

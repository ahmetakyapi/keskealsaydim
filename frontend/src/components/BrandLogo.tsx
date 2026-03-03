import { cn } from '@/lib/utils';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  markClassName?: string;
  textClassName?: string;
}

const iconSizeClass = {
  sm: 'h-9 w-9 p-1',
  md: 'h-10 w-10 p-1',
  lg: 'h-12 w-12 p-[5px]',
};

const fullLogoSizeClass = {
  sm: 'h-10 w-[138px]',
  md: 'h-11 w-[152px]',
  lg: 'h-14 w-[196px]',
};

export function BrandLogo({
  size = 'md',
  showText = true,
  className,
  markClassName,
  textClassName,
}: BrandLogoProps) {
  if (showText) {
    return (
      <div className={cn('flex items-center', className)}>
        <span
          className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden',
            fullLogoSizeClass[size],
            textClassName
          )}
        >
          <img
            src="/logo-1024x1024-rounded.png"
            alt="Keşke Alsaydım"
            className="h-full w-full scale-[1.34] object-contain"
          />
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_18px_38px_rgba(6,12,18,0.22)]',
          iconSizeClass[size],
          markClassName
        )}
      >
        <img
          src="/logo-1024x1024-rounded.png"
          alt="Keşke Alsaydım"
          className="h-full w-full scale-[1.3] rounded-xl object-cover object-top"
        />
      </span>
    </div>
  );
}

import { cn } from '@/lib/utils';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  markClassName?: string;
  textClassName?: string;
}

const markSizeClass = {
  sm: 'h-8 w-8 rounded-[10px] text-sm',
  md: 'h-10 w-10 rounded-[13px] text-[1.05rem]',
  lg: 'h-[62px] w-[62px] rounded-[20px] text-[1.55rem]',
};

const textSizeClass = {
  sm: 'text-[0.92rem]',
  md: 'text-[1.08rem]',
  lg: 'text-xl',
};

const GRADIENT_LETTER: React.CSSProperties = {
  background: 'linear-gradient(135deg, #10b981 0%, #38bdf8 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

export function BrandLogo({
  size = 'md',
  showText = true,
  className,
  markClassName,
  textClassName,
}: Readonly<BrandLogoProps>) {
  const mark = (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center font-black',
        markSizeClass[size],
        markClassName
      )}
      style={{
        background:
          'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(56, 189, 248, 0.22) 100%)',
        border: '1.5px solid rgba(16, 185, 129, 0.40)',
        boxShadow:
          '0 0 32px rgba(16, 185, 129, 0.22), 0 4px 18px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      <span style={GRADIENT_LETTER}>K</span>
    </span>
  );

  if (!showText) {
    return <div className={cn('flex items-center', className)}>{mark}</div>;
  }

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {mark}
      <span className={cn('tracking-tight', textSizeClass[size], textClassName)}>
        <span className="font-medium text-slate-300">Keşke </span>
        <span className="label-brand font-bold">Alsaydım</span>
      </span>
    </div>
  );
}

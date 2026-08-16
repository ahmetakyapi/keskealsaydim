import { cn } from '@/lib/utils';

interface ToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  /** Required unless the switch is wrapped by a <label>. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  id?: string;
}

const SIZES = {
  sm: { track: 'h-5 w-9', thumb: 'h-3.5 w-3.5', on: 'translate-x-4', off: 'translate-x-0.5' },
  md: { track: 'h-6 w-11', thumb: 'h-5 w-5', on: 'translate-x-5', off: 'translate-x-0.5' },
} as const;

export function Toggle({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  className,
  id,
  ...aria
}: ToggleProps) {
  const dimensions = SIZES[size];

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        dimensions.track,
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className
      )}
      {...aria}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none inline-block transform rounded-full bg-background shadow ring-0 transition-transform',
          dimensions.thumb,
          checked ? dimensions.on : dimensions.off
        )}
      />
    </button>
  );
}

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-primary/25 bg-primary/12 text-primary',
        success: 'border-success/25 bg-success/12 text-success',
        danger: 'border-danger/25 bg-danger/12 text-danger',
        warning: 'border-warning/25 bg-warning/12 text-warning',
        secondary: 'border-secondary/25 bg-secondary/12 text-secondary',
        neutral: 'border-border bg-muted text-muted-foreground',
        outline: 'border-border text-muted-foreground',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[10px]',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };

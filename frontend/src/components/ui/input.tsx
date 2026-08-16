import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
  /** Rendered inside the field on the right (unit suffix, toggle button). */
  trailing?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, trailing, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className="w-full">
        <div className="relative">
          {icon && (
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-10',
              trailing && 'pr-11',
              error && 'border-danger focus-visible:ring-danger',
              className
            )}
            {...props}
          />
          {trailing && (
            // Anchored to the field, not the wrapper, so an error message
            // below cannot push it down onto the text.
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</span>
          )}
        </div>
        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: "default" | "success" | "danger" | "gradient";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = "default", size = "md", showLabel = false, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeClasses = {
      sm: "h-1",
      md: "h-2",
      lg: "h-3",
    };

    const variantClasses = {
      default: "bg-primary",
      success: "bg-success",
      danger: "bg-danger",
      gradient: "bg-gradient-to-r from-primary to-secondary",
    };

    return (
      <div className="w-full">
        <div
          ref={ref}
          className={cn(
            "w-full overflow-hidden rounded-full bg-white/10",
            sizeClasses[size],
            className
          )}
          {...props}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              variantClasses[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <span className="text-xs text-white/60 mt-1">{Math.round(percentage)}%</span>
        )}
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };

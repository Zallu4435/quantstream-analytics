import * as React from "react";
import { cn } from "@/shared/lib/utils";

const Badge = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "success" | "danger" | "outline" }>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-primary/10 text-primary border-primary/20",
      success: "bg-success/10 text-success border-success/20",
      danger: "bg-danger/10 text-danger border-danger/20",
      outline: "bg-transparent text-foreground border-border",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };

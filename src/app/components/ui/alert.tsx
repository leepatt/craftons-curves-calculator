import * as React from "react";
import { cn } from "../../lib/utils";

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "warning";
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4",
        {
          "bg-background text-foreground": variant === "default",
          "border-destructive/50 text-destructive dark:border-destructive": variant === "destructive",
          "border-orange-400/30 text-orange-600 dark:border-orange-400/40 dark:text-orange-400 flex items-center gap-2": variant === "warning",
        },
        className
      )}
      {...props}
    />
  )
);

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));

Alert.displayName = "Alert";
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription }; 
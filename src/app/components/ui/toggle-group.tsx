import * as React from "react";
import { cn } from "../../lib/utils";

export interface ToggleGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  type?: "single" | "multiple";
}

export interface ToggleGroupItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  variant?: "default" | "outline";
}

const ToggleGroupContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ className, value, onValueChange, children, ...props }, ref) => {
    return (
      <ToggleGroupContext.Provider value={{ value, onValueChange }}>
        <div
          ref={ref}
          className={cn(
            "flex items-center gap-1 rounded-md",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </ToggleGroupContext.Provider>
    );
  }
);

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, value, children, onClick, variant = "default", ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext);
    const isSelected = context.value === value;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      context.onValueChange?.(value);
      onClick?.(e);
    };

    const variantStyles = {
      default: isSelected
        ? "bg-slate-900 text-white border-slate-900"
        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
      outline: isSelected
        ? "bg-slate-900 text-white border-slate-900"
        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border cursor-pointer",
          variantStyles[variant],
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ToggleGroup.displayName = "ToggleGroup";
ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem }; 
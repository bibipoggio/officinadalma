import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        primary: "bg-primary/10 text-primary",
        outline: "border border-border bg-transparent text-foreground hover:bg-accent",
        muted: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-3 py-1 text-sm",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {
  onRemove?: () => void;
  removable?: boolean;
}

const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, variant, size, children, onRemove, removable = false, ...props }, ref) => (
    <span ref={ref} className={cn(chipVariants({ variant, size, className }))} {...props}>
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Remover"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
);
Chip.displayName = "Chip";

export { Chip, chipVariants };

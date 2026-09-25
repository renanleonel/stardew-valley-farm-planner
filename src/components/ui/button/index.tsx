import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const styles = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "bg-amber-400 text-forest-950 hover:bg-amber-300",
        secondary:
          "border border-forest-600 bg-forest-800 text-parchment hover:bg-forest-700",
        ghost: "text-mist hover:bg-forest-700 hover:text-parchment",
        selected: "bg-forest-600 text-parchment ring-1 ring-amber-300/60",
        danger: "bg-red-900/30 text-red-100 hover:bg-red-900/60",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        icon: "size-10",
        compact: "size-9",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  },
);

export function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  size?: "default" | "sm" | "icon" | "compact";
  variant?: "default" | "secondary" | "ghost" | "selected" | "danger";
}) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(styles({ size, variant }), className)}
      {...props}
    />
  );
}

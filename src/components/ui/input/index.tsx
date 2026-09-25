import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-forest-600 bg-forest-950 px-3 text-sm text-parchment placeholder:text-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300",
        className,
      )}
      {...props}
    />
  );
}

import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

/** Figma Chip 71:657 — Default / Active */
export function Chip({ active = false, className, children, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 min-h-[32px] items-center rounded-pill border px-md text-label-md transition-colors duration-150",
        active
          ? "border-border-accent bg-accent-selected text-text-primary"
          : "border-border-subtle bg-surface text-text-secondary",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

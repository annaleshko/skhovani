import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

/** Time selection pill (18г) */
export function TimePill({ selected = false, className, children, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-10 min-h-[40px] items-center justify-center rounded-pill px-lg text-[15px] font-medium transition-colors duration-150",
        selected
          ? "bg-accent-subtle text-text-accent ring-1 ring-border-accent"
          : "bg-surface-raised text-text-secondary",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
};

export function IconButton({ label, children, className, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-text-primary",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

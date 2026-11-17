import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-text-on-accent border border-border-subtle/0 enabled:active:opacity-90 disabled:bg-surface-raised disabled:text-text-secondary",
  secondary:
    "bg-surface-raised text-text-primary border border-border-subtle enabled:active:opacity-90",
  ghost: "bg-transparent text-text-secondary border border-transparent enabled:active:opacity-80",
};

/** Figma Button 59:21 — Primary / Secondary / Ghost */
export function Button({
  variant = "primary",
  fullWidth = true,
  className,
  type = "button",
  children,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-control min-h-[44px] items-center justify-center rounded-pill px-xl text-label-lg transition-opacity",
        fullWidth && "w-full",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

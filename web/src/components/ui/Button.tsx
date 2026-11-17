import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

/** No border by default (Figma primary has none). Variants that need a stroke use --color-border-button. */
const variants: Record<ButtonVariant, string> = {
  primary:
    "border-0 bg-accent text-text-on-accent enabled:active:opacity-90 disabled:bg-surface-raised disabled:text-text-secondary",
  secondary:
    "border-0 bg-surface-raised text-text-primary enabled:active:opacity-90",
  ghost: "border-0 bg-transparent text-text-secondary enabled:active:opacity-80",
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

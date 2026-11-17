import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

export type SocialProvider = "google" | "email";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  provider: SocialProvider;
};

const labels: Record<SocialProvider, string> = {
  google: "Продовжити з Google",
  email: "Продовжити з email",
};

/** Figma Social Button 83:1297 */
export function SocialButton({ provider, className, children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-control w-full min-h-[44px] items-center justify-center gap-sm rounded-pill border border-border-subtle bg-surface-raised px-xl text-label-lg text-text-primary",
        className,
      )}
      {...rest}
    >
      {provider === "google" ? (
        <span aria-hidden className="text-[18px] font-bold text-text-accent">
          G
        </span>
      ) : (
        <span aria-hidden className="text-[16px] text-text-accent">
          @
        </span>
      )}
      {children ?? labels[provider]}
    </button>
  );
}

import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  description?: string;
  selected?: boolean;
  trailing?: ReactNode;
};

/** Figma Option Card 60:46 — rhythm / choice cards */
export function OptionCard({
  title,
  description,
  selected = false,
  trailing,
  className,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "flex w-full min-h-[44px] items-start gap-md rounded-md border p-lg text-left transition-colors duration-150",
        selected
          ? "border-border-accent bg-accent-subtle"
          : "border-border-subtle bg-surface",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cn(
          "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-border-accent bg-accent" : "border-border-control",
        )}
      >
        {selected ? <span className="size-2 rounded-full bg-text-on-accent" /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2xs">
        <span className="text-label-lg text-text-primary">{title}</span>
        {description ? (
          <span className="text-body-md text-text-secondary">{description}</span>
        ) : null}
      </span>
      {trailing}
    </button>
  );
}

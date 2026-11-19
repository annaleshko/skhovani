"use client";

import { cn } from "@/lib/cn";

type Props = {
  total: number;
  current: number;
  className?: string;
  /** Stop titles for aria-labels (index 0 = step 1). */
  labels?: string[];
  /** Jump to 1-based step index. */
  onSelect?: (step: number) => void;
};

/** Progress segments (tour 1/4 etc.) — tappable when onSelect is set. */
export function ProgressStepper({
  total,
  current,
  className,
  labels,
  onSelect,
}: Props) {
  return (
    <div
      className={cn("flex w-full gap-2xs", className)}
      role={onSelect ? "group" : "progressbar"}
      aria-label={onSelect ? "Кроки туру" : undefined}
      aria-valuemin={onSelect ? undefined : 1}
      aria-valuemax={onSelect ? undefined : total}
      aria-valuenow={onSelect ? undefined : current}
    >
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const filled = step <= current;
        const title = labels?.[i]?.trim() || `Крок ${step}`;
        const bar = (
          <span
            className={cn(
              "h-1 w-full rounded-pill",
              filled
                ? "bg-[var(--color-progress-active)]"
                : "bg-[var(--color-progress-inactive)]",
            )}
            aria-hidden
          />
        );
        if (!onSelect) {
          return (
            <span key={i} className="flex h-1 min-h-1 flex-1">
              {bar}
            </span>
          );
        }
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(step)}
            aria-label={`Крок ${step} з ${total}: ${title}`}
            aria-current={step === current ? "step" : undefined}
            className="relative flex min-h-8 flex-1 items-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-accent)]"
          >
            {bar}
          </button>
        );
      })}
    </div>
  );
}

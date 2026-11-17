import { cn } from "@/lib/cn";

type Props = {
  total: number;
  current: number;
  className?: string;
};

/** Progress segments (tour 1/4 etc.) */
export function ProgressStepper({ total, current, className }: Props) {
  return (
    <div
      className={cn("flex w-full gap-2xs", className)}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-pill",
            i < current
              ? "bg-[var(--color-progress-active)]"
              : "bg-[var(--color-progress-inactive)]",
          )}
        />
      ))}
    </div>
  );
}

import { cn } from "@/lib/cn";
import type { CSSProperties } from "react";

export type TrailDotState = "passed" | "current" | "upcoming";

export type TrailItem = {
  label: string;
  state: TrailDotState;
};

type Props = {
  items: TrailItem[];
  className?: string;
  /** Absolute position; defaults match screen 9. Screen 11: { left: 24, top: 76 }. */
  style?: CSSProperties;
};

/**
 * Figma «Нагадування шляху» (114:1824 / 125:6432):
 * «Вінниця — Херсон — Музей» with Passed / Current / Upcoming dots.
 * Shown on screens 9 and 11 only.
 */
export function RouteTrail({ items, className, style }: Props) {
  return (
    <nav
      aria-label="Нагадування шляху"
      className={cn(
        "pointer-events-none absolute z-30 flex items-center gap-2xs",
        className,
      )}
      style={{
        left: 24,
        top: "calc(32px + var(--safe-top))",
        ...style,
      }}
    >
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-2xs">
          {i > 0 ? (
            <span
              aria-hidden
              className={cn(
                "h-px w-4",
                item.state === "upcoming" ? "bg-[var(--color-border-control)]" : "bg-accent/60",
              )}
            />
          ) : null}
          <span className="flex items-center gap-sm">
            <span
              aria-hidden
              className={cn(
                "size-3 shrink-0 rounded-[6px]",
                item.state === "passed" && "bg-accent opacity-60",
                item.state === "current" &&
                  "border-[1.5px] border-accent bg-accent shadow-[0_0_0_3px_rgba(233,184,114,0.25)]",
                item.state === "upcoming" &&
                  "border-[1.5px] border-[var(--color-border-control)] bg-transparent",
              )}
            />
            <span
              className={cn(
                item.state === "current"
                  ? "text-label-md text-text-primary"
                  : "text-caption text-text-secondary",
              )}
            >
              {item.label}
            </span>
          </span>
        </span>
      ))}
    </nav>
  );
}

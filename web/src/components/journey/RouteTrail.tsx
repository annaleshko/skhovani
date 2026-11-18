import { cn } from "@/lib/cn";
import { forwardRef, type CSSProperties, type ReactNode } from "react";

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

/** Figma 114:1824 connector — #98928C (= --color-text-secondary / border-control). */
const CONNECTOR = "var(--color-text-secondary)";
const DOT_PASSED = "var(--color-bg-accent)";
const RING_UPCOMING = "var(--color-border-control)";

function StepDot({ state }: { state: TrailDotState }) {
  if (state === "current") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/ui/trail-current.svg"
        alt=""
        width={12}
        height={12}
        className="size-3 shrink-0"
        aria-hidden
      />
    );
  }
  if (state === "passed") {
    return (
      <span
        aria-hidden
        className="size-3 shrink-0 rounded-[6px]"
        style={{ backgroundColor: DOT_PASSED, opacity: 0.6 }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="size-3 shrink-0 rounded-[6px] bg-transparent"
      style={{
        borderWidth: 1.5,
        borderStyle: "solid",
        borderColor: RING_UPCOMING,
      }}
    />
  );
}

/**
 * Figma «Нагадування шляху» (114:1824 / instance 125:6432):
 * row gap 4px; connector 16×1 solid #98928C for all states.
 * Ref: docs/figma-refs/11-museum.png, 09-zoom.png.
 */
export const RouteTrail = forwardRef<HTMLElement, Props>(
  function RouteTrail({ items, className, style }, ref) {
    const row: ReactNode[] = [];
    items.forEach((item, i) => {
      if (i > 0) {
        row.push(
          <span
            key={`line-${i}`}
            aria-hidden
            data-trail-connector
            className="h-px w-4 shrink-0"
            style={{ backgroundColor: CONNECTOR }}
          />,
        );
      }
      row.push(
        <span key={`${item.label}-${i}`} className="flex items-center gap-sm">
          <StepDot state={item.state} />
          <span
            className={cn(
              item.state === "current"
                ? "text-label-md text-text-primary"
                : "text-caption text-text-secondary",
            )}
          >
            {item.label}
          </span>
        </span>,
      );
    });

    return (
      <nav
        ref={ref}
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
        {row}
      </nav>
    );
  },
);

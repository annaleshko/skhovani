import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  className?: string;
  /** viewBox of public/map/map.svg — adjust if SVG dimensions differ */
  viewBox?: string;
};

/**
 * Figma Illustration/Map 61:46 — wraps map.svg in SVG coordinate space.
 * Camera transforms (Stage 4) should wrap this component.
 */
export function MapIllustration({
  children,
  className,
  viewBox = "0 0 408 296",
}: Props) {
  return (
    <svg
      viewBox={viewBox}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="Карта України"
    >
      <image href="/map/map.svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
      {children}
    </svg>
  );
}

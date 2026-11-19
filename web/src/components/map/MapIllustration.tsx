import { MapLandArt } from "@/components/map/MapLandArt";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  className?: string;
  /** viewBox of public/map/map.svg — adjust if SVG dimensions differ */
  viewBox?: string;
};

/**
 * Inline map paths (vector at any scale).
 * Camera transforms () should wrap this component.
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
      <MapLandArt />
      {children}
    </svg>
  );
}

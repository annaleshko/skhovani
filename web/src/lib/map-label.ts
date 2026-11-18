import { MAP_VIEWBOX } from "@/lib/geo";

/** Prefer right; flip left when the marker is near the right edge. */
export function mapLabelSide(
  x: number,
  mapW: number = MAP_VIEWBOX.w,
): "left" | "right" {
  return x > mapW * 0.72 ? "left" : "right";
}

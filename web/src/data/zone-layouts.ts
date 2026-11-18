/**
 * Maps touch-zone position labels to normalized rects (x, y, w, h in 0–1).
 * TODO(photo): refine once hall photos / custom layouts are calibrated.
 */

export type NormRect = { x: number; y: number; w: number; h: number };

const GRID_3X3: Record<string, NormRect> = {
  "top-left": { x: 0, y: 0, w: 1 / 3, h: 1 / 3 },
  "top-center": { x: 1 / 3, y: 0, w: 1 / 3, h: 1 / 3 },
  "top-right": { x: 2 / 3, y: 0, w: 1 / 3, h: 1 / 3 },
  "middle-left": { x: 0, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
  "middle-center": { x: 1 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
  "middle-right": { x: 2 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
  "bottom-left": { x: 0, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
  "bottom-center": { x: 1 / 3, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
  "bottom-right": { x: 2 / 3, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
};

const GRID_3X2: Record<string, NormRect> = {
  "top-left": { x: 0, y: 0, w: 1 / 3, h: 0.5 },
  "top-center": { x: 1 / 3, y: 0, w: 1 / 3, h: 0.5 },
  "top-right": { x: 2 / 3, y: 0, w: 1 / 3, h: 0.5 },
  "bottom-left": { x: 0, y: 0.5, w: 1 / 3, h: 0.5 },
  "bottom-center": { x: 1 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
  "bottom-right": { x: 2 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
  // aliases used in some passports
  "middle-left": { x: 0, y: 0.25, w: 1 / 3, h: 0.5 },
  "middle-center": { x: 1 / 3, y: 0.25, w: 1 / 3, h: 0.5 },
  "middle-right": { x: 2 / 3, y: 0.25, w: 1 / 3, h: 0.5 },
};

/** Custom positions (Плафон oval etc.) — rough guesses until a photo exists. */
const CUSTOM: Record<string, NormRect> = {
  center: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 },
  oval: { x: 0.2, y: 0.15, w: 0.6, h: 0.7 },
  left: { x: 0, y: 0.2, w: 0.4, h: 0.6 },
  right: { x: 0.6, y: 0.2, w: 0.4, h: 0.6 },
  top: { x: 0.2, y: 0, w: 0.6, h: 0.4 },
  bottom: { x: 0.2, y: 0.6, w: 0.6, h: 0.4 },
};

export function getZoneRect(
  grid: "3x3" | "3x2" | "custom",
  position: string,
): NormRect {
  const key = position.trim().toLowerCase();
  if (grid === "3x3") return GRID_3X3[key] ?? GRID_3X3["middle-center"];
  if (grid === "3x2") return GRID_3X2[key] ?? GRID_3X2["bottom-center"];
  return CUSTOM[key] ?? CUSTOM.center;
}

/** Center of a zone — fallback when tour stop x/y/zoom are null. */
export function getZoneCenter(
  grid: "3x3" | "3x2" | "custom",
  positionOrHint: string,
): { x: number; y: number } {
  const rect = getZoneRect(grid, positionOrHint);
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

/** Point for a touch zone: explicit x/y or grid cell center. */
export function getZonePoint(
  zone: { position: string; x?: number | null; y?: number | null },
  grid: "3x3" | "3x2" | "custom",
): { x: number; y: number } {
  if (zone.x != null && zone.y != null) {
    return { x: zone.x, y: zone.y };
  }
  return getZoneCenter(grid, zone.position);
}

/** Nearest zone within `radius` (normalized). Returns index or -1. */
export function hitTestZonePoint(
  nx: number,
  ny: number,
  zones: { position: string; x?: number | null; y?: number | null }[],
  grid: "3x3" | "3x2" | "custom",
  radius = 0.12,
): number {
  let best = -1;
  let bestD = radius;
  for (let i = 0; i < zones.length; i++) {
    const p = getZonePoint(zones[i]!, grid);
    const d = Math.hypot(nx - p.x, ny - p.y);
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

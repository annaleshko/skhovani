import { getZoneCenter } from "@/data/zone-layouts";
import type { TourStop, TouchZones } from "@/data/types";

export type LensTarget = { x: number; y: number; zoom: number };

/** Heuristic: map Ukrainian locationHint → grid cell when coords are null. */
export function hintToGridPosition(hint: string): string {
  const h = hint.toLowerCase();
  if (h.includes("ліва") || h.includes("лівий") || h.includes("зліва")) {
    if (h.includes("верх")) return "top-left";
    if (h.includes("нижн")) return "bottom-left";
    return "middle-left";
  }
  if (h.includes("прав")) {
    if (h.includes("верх")) return "top-right";
    if (h.includes("нижн")) return "bottom-right";
    return "middle-right";
  }
  if (h.includes("нижн") || h.includes("передн")) return "bottom-center";
  if (h.includes("верх") || h.includes("небо")) return "top-center";
  if (h.includes("центр")) return "middle-center";
  return "middle-center";
}

/** Resolve stop camera; null x/y/zoom → center of locationHint grid cell, zoom 2.4. */
export function resolveStopTarget(
  stop: TourStop,
  touchZones: TouchZones,
): LensTarget {
  if (stop.x != null && stop.y != null && stop.zoom != null) {
    return { x: stop.x, y: stop.y, zoom: stop.zoom };
  }
  const pos = hintToGridPosition(stop.locationHint);
  const c = getZoneCenter(touchZones.grid, pos);
  return { x: c.x, y: c.y, zoom: 2.4 };
}

/**
 * Camera that scales from top-left (origin 0 0) so point (nx,ny) in 0–1
 * lands at the stage center at the given zoom.
 */
export function lensCamera(
  nx: number,
  ny: number,
  zoom: number,
  stageW: number,
  stageH: number,
  imgW: number,
  imgH: number,
): { tx: number; ty: number; scale: number } {
  const scale = zoom;
  return {
    tx: stageW / 2 - nx * imgW * scale,
    ty: stageH / 2 - ny * imgH * scale,
    scale,
  };
}

/** Fit image to stage width (full artwork view). */
export function fitWidthCamera(
  stageW: number,
  stageH: number,
  imgW: number,
  imgH: number,
): { tx: number; ty: number; scale: number } {
  const scale = stageW / imgW;
  const scaledH = imgH * scale;
  return {
    tx: 0,
    ty: (stageH - scaledH) / 2,
    scale,
  };
}

/** Ring timer duration from stop text (spec: max(6s, words × 0.45s)). */
export function stopDurationSec(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(6, words * 0.45);
}

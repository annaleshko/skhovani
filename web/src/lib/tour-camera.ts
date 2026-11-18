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

/**
 * Resolve stop camera. x/y/zoom are 0–1 / zoom of the whole composed art image
 * relative to the full framed fit (scale 1 at tour start).
 */
export function resolveStopTarget(
  stop: TourStop,
  touchZones: TouchZones,
): LensTarget {
  if (stop.x != null && stop.y != null && stop.zoom != null) {
    return { x: stop.x, y: stop.y, zoom: stop.zoom };
  }
  if (process.env.NODE_ENV === "development") {
    console.warn(
      `[tour] stop ${stop.n} «${stop.title}» missing x/y/zoom — falling back to locationHint grid`,
    );
  }
  const pos = hintToGridPosition(stop.locationHint);
  const c = getZoneCenter(touchZones.grid, pos);
  return { x: c.x, y: c.y, zoom: stop.zoom ?? 2.4 };
}

/**
 * Camera: scale from the fitted image's top-left so (nx,ny) lands at focus.
 * `zoom` is relative to the full framed artwork (fit = 1).
 * Clamps translate when possible so empty margins past the frame don't show.
 */
export function lensCamera(
  nx: number,
  ny: number,
  zoom: number,
  img: { x: number; y: number; w: number; h: number },
  focusX: number,
  focusY: number,
  stageW: number,
  viewH: number,
): { tx: number; ty: number; scale: number } {
  const scale = zoom;
  let tx = focusX - img.x - nx * img.w * scale;
  let ty = focusY - img.y - ny * img.h * scale;

  const scaledW = img.w * scale;
  const scaledH = img.h * scale;

  // Prefer covering the visible stage when the zoomed frame is large enough
  if (scaledW >= stageW) {
    const minTx = stageW - img.x - scaledW;
    const maxTx = -img.x;
    tx = Math.min(maxTx, Math.max(minTx, tx));
  }
  if (scaledH >= viewH) {
    const minTy = viewH - img.y - scaledH;
    const maxTy = -img.y;
    ty = Math.min(maxTy, Math.max(minTy, ty));
  }

  return { tx, ty, scale };
}

/**
 * Screen-space position of a normalized image point after the post-clamp
 * camera transform (ring must follow this, not the ideal focus center).
 */
export function stopScreenPoint(
  nx: number,
  ny: number,
  cam: { tx: number; ty: number; scale: number },
  img: { x: number; y: number; w: number; h: number },
): { x: number; y: number } {
  return {
    x: img.x + nx * img.w * cam.scale + cam.tx,
    y: img.y + ny * img.h * cam.scale + cam.ty,
  };
}

/** Fit image into a slot at its own aspect (full framed artwork view). */
export function fitSlotOrigin(
  slot: { x: number; y: number; w: number; h: number },
  imgW: number,
  imgH: number,
): { x: number; y: number; w: number; h: number } {
  const fit = Math.min(slot.w / imgW, slot.h / imgH);
  const w = imgW * fit;
  const h = imgH * fit;
  return {
    x: slot.x + (slot.w - w) / 2,
    y: slot.y + (slot.h - h) / 2,
    w,
    h,
  };
}

/**
 * Passport 16: force frame width to the slot (x24 w342).
 * Height follows image aspect; vertically centered in the slot.
 */
export function fitSlotWidth(
  slot: { x: number; y: number; w: number; h: number },
  imgW: number,
  imgH: number,
): { x: number; y: number; w: number; h: number } {
  if (!imgW || !imgH) return { x: slot.x, y: slot.y, w: slot.w, h: slot.h };
  const h = (slot.w * imgH) / imgW;
  return {
    x: slot.x,
    y: slot.y + (slot.h - h) / 2,
    w: slot.w,
    h,
  };
}

/** Pointer ring diameter (screen px). */
export const POINTER_RING_PX = 120;

/** Ring timer duration from stop text (spec: max(6s, words × 0.45s)). */
export function stopDurationSec(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(6, words * 0.45);
}

/** Composed image used for tour / calibrate (Melitopol uses the open variant). */
export function tourImageSrc(artwork: {
  slug: string;
  image: string | null;
}): string | null {
  if (artwork.slug === "skifske-zoloto-melitopolia") {
    return "/art/skifske-zoloto-melitopolia-open.webp";
  }
  return artwork.image;
}

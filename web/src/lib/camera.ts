import { MAP_VIEWBOX, type MapPoint } from "./geo";

export type CameraTransform = {
  tx: number;
  ty: number;
  scale: number;
};

/** App frame (mobile). */
export const FRAME = { w: 390, h: 844 } as const;

/**
 * Land in map.svg viewBox (408×296): x 36–372, y 14–238 → 336×224 units.
 * Figma 87:1725 places that land box at frame (27, 253, 336, 224).
 * With SVG drawn 1 viewBox unit = 1px (scale 1), svg top-left = (−9, 239).
 */
export const MAP_LAND = { x: 36, y: 14, w: 336, h: 224 } as const;
export const MAP_07 = { x: 27, y: 253, w: 336, h: 224 } as const;
/** SVG top-left on screen 07 so land aligns with MAP_07. */
export const MAP_07_ORIGIN = {
  x: MAP_07.x - MAP_LAND.x, // -9
  y: MAP_07.y - MAP_LAND.y, // 239
} as const;
/** 07 camera scale: 1 viewBox unit = 1 CSS px. */
export const MAP_07_SCALE = 1;

/** Zoom scale relative to 07 (2090/336 ≈ 6.22); Kherson screen focus. */
export const ZOOM_SCALE = 6.22;
export const ZOOM_FOCUS = { x: 208, y: 356 } as const;

/** Camera for screen 07 (land box = Figma 87:1725). */
export function camera07(): CameraTransform {
  return { tx: MAP_07_ORIGIN.x, ty: MAP_07_ORIGIN.y, scale: MAP_07_SCALE };
}

/**
 * Camera for screen 9: place `pt` (Херсон) at ZOOM_FOCUS with scale ZOOM_SCALE.
 */
export function camera09(pt: MapPoint): CameraTransform {
  return cameraPlaceAt(pt, MAP_07_SCALE * ZOOM_SCALE, ZOOM_FOCUS.x, ZOOM_FOCUS.y);
}

/**
 * Camera that scales from top-left (transform-origin: 0 0).
 * ViewBox units = CSS px at scale 1 (SVG sized to viewBox).
 */
export function cameraPlaceAt(
  pt: MapPoint,
  scale: number,
  screenX: number,
  screenY: number,
): CameraTransform {
  return {
    tx: screenX - pt.x * scale,
    ty: screenY - pt.y * scale,
    scale,
  };
}

/** Place `pt` at the frame center. */
export function cameraCenterOn(pt: MapPoint, scale: number): CameraTransform {
  return cameraPlaceAt(pt, scale, FRAME.w / 2, FRAME.h / 2);
}

/** Screen-space position of a map point under a camera transform. */
export function cameraProjectPoint(pt: MapPoint, cam: CameraTransform): MapPoint {
  return {
    x: cam.tx + pt.x * cam.scale,
    y: cam.ty + pt.y * cam.scale,
  };
}

/** Linear interpolate two cameras. */
export function cameraLerp(
  a: CameraTransform,
  b: CameraTransform,
  t: number,
): CameraTransform {
  return {
    tx: a.tx + (b.tx - a.tx) * t,
    ty: a.ty + (b.ty - a.ty) * t,
    scale: a.scale + (b.scale - a.scale) * t,
  };
}

/** Land width on screen under a camera (should be 336 ±2 on 07). */
export function landScreenWidth(cam: CameraTransform): number {
  return MAP_LAND.w * cam.scale;
}

// Re-export viewBox size for callers that need it
export { MAP_VIEWBOX };

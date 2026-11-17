/**
 * Map projection + distance helpers.
 *
 * `map.svg` viewBox is 408×296. Land roughly spans x 36–372, y 14–238.
 * Equirectangular fit from centroids of all 25 regions vs real coords
 * (RMS ≈ 3px), in viewBox units directly:
 *   vbX = 18.5616 · lng − 374.453
 *   vbY = −28.8635 · lat + 1526.240
 */

export type MapPoint = { x: number; y: number };

export const MAP_VIEWBOX = { w: 408, h: 296 } as const;

/** Longitude → viewBox X (px). */
export const MAP_X_A = 18.5616;
export const MAP_X_B = -374.453;

/** Latitude → viewBox Y (px). */
export const MAP_Y_A = -28.8635;
export const MAP_Y_B = 1526.24;

/** Expected viewBox points for unit tests (±1). */
export const MAP_TEST_CITIES = [
  { name: "vinnytsia", lat: 49.2331, lng: 28.4682, x: 154.0, y: 105.2 },
  { name: "kherson", lat: 46.6354, lng: 32.6169, x: 231.0, y: 180.2 },
  { name: "lviv", lat: 49.8397, lng: 24.0297, x: 71.6, y: 87.7 },
  { name: "kharkiv", lat: 49.9935, lng: 36.2304, x: 298.0, y: 83.3 },
] as const;

/** Coordinates in the map SVG viewBox (408×296). */
export function projectToMap(lat: number, lng: number): MapPoint {
  return {
    x: MAP_X_A * lng + MAP_X_B,
    y: MAP_Y_A * lat + MAP_Y_B,
  };
}

export function getMapViewBox() {
  return MAP_VIEWBOX;
}

/** Great-circle distance in km (haversine), rounded. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Quadratic Bezier control point for a soft arc above the chord. */
export function arcControl(from: MapPoint, to: MapPoint, lift = 0.28): MapPoint {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const bulge = len * lift;
  return { x: mx, y: my - bulge };
}

export function pointOnQuad(
  from: MapPoint,
  ctrl: MapPoint,
  to: MapPoint,
  t: number,
): MapPoint {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y,
  };
}

export function quadPath(from: MapPoint, ctrl: MapPoint, to: MapPoint): string {
  return `M ${from.x} ${from.y} Q ${ctrl.x} ${ctrl.y} ${to.x} ${to.y}`;
}

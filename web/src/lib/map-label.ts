import { MAP_VIEWBOX } from "@/lib/geo";

export type MapLabelSide = "left" | "right" | "top" | "bottom";

export type MapLabelMarker = {
  id: string;
  x: number;
  y: number;
  label: string;
  /** Prefer these sides first (optional). */
  prefer?: MapLabelSide[];
};

export type MapLabelPlacement = {
  side: MapLabelSide;
  /** Extra vertical offset in SVG px (keeps gap from marker). */
  dy: number;
};

/** Prefer right; flip left when the marker is near the right edge. */
export function mapLabelSide(
  x: number,
  mapW: number = MAP_VIEWBOX.w,
): "left" | "right" {
  return x > mapW * 0.72 ? "left" : "right";
}

/** Gap between visual marker edge and label text. */
export const MAP_LABEL_GAP_SVG = 5;
/**
 * Visual marker radius (pin/star/dot), not the 44×44 tap target.
 * ~8–11 SVG px depending on variant — use mid for layout.
 */
export const MAP_MARKER_R_SVG = 9;
/** ~22 CSS px hit radius → SVG units at typical ~360px map width. */
export const MAP_HIT_R_SVG = 25;

const FONT = 12;
const LINE_H = 14;

function approxWidth(label: string, fontSize = FONT): number {
  return Math.max(24, label.length * fontSize * 0.58);
}

function labelBox(
  m: MapLabelMarker,
  side: MapLabelSide,
  dy: number,
  half: number = MAP_MARKER_R_SVG,
): { x0: number; y0: number; x1: number; y1: number } {
  const w = approxWidth(m.label);
  const gap = MAP_LABEL_GAP_SVG;
  if (side === "right") {
    const x0 = m.x + half + gap;
    return { x0, y0: m.y - LINE_H / 2 + dy, x1: x0 + w, y1: m.y + LINE_H / 2 + dy };
  }
  if (side === "left") {
    const x1 = m.x - half - gap;
    return { x0: x1 - w, y0: m.y - LINE_H / 2 + dy, x1, y1: m.y + LINE_H / 2 + dy };
  }
  if (side === "top") {
    const y1 = m.y - half - gap + dy;
    return {
      x0: m.x - w / 2,
      y0: y1 - LINE_H,
      x1: m.x + w / 2,
      y1,
    };
  }
  const y0 = m.y + half + gap + dy;
  return {
    x0: m.x - w / 2,
    y0,
    x1: m.x + w / 2,
    y1: y0 + LINE_H,
  };
}

function overlaps(
  a: { x0: number; y0: number; x1: number; y1: number },
  b: { x0: number; y0: number; x1: number; y1: number },
  pad = 4,
): boolean {
  return !(
    a.x1 + pad < b.x0 ||
    b.x1 + pad < a.x0 ||
    a.y1 + pad < b.y0 ||
    b.y1 + pad < a.y0
  );
}

/** True if the label box intersects a marker hit circle. */
function hitsCircle(
  box: { x0: number; y0: number; x1: number; y1: number },
  cx: number,
  cy: number,
  r: number,
): boolean {
  const qx = Math.max(box.x0, Math.min(cx, box.x1));
  const qy = Math.max(box.y0, Math.min(cy, box.y1));
  return Math.hypot(cx - qx, cy - qy) < r;
}

/**
 * Assign non-overlapping label sides (close to the visual marker).
 * Labels may sit further only to avoid collisions; hit circles still use MAP_HIT_R_SVG.
 */
export function layoutMapLabels(
  markers: MapLabelMarker[],
): Map<string, MapLabelPlacement> {
  const out = new Map<string, MapLabelPlacement>();
  const placed: { id: string; box: ReturnType<typeof labelBox> }[] = [];
  const order = [...markers].sort((a, b) => a.x - b.x || a.y - b.y);

  for (const m of order) {
    const sides: MapLabelSide[] = m.prefer ?? [
      mapLabelSide(m.x),
      mapLabelSide(m.x) === "left" ? "right" : "left",
      "top",
      "bottom",
    ];
    const dys = [0, -14, 14, -24, 24, -34, 34];
    let chosen: MapLabelPlacement | null = null;
    for (const side of sides) {
      for (const dy of dys) {
        const box = labelBox(m, side, dy);
        if (placed.some((p) => overlaps(box, p.box))) continue;
        const inHit = markers.some(
          (o) => o.id !== m.id && hitsCircle(box, o.x, o.y, MAP_HIT_R_SVG),
        );
        if (inHit) continue;
        chosen = { side, dy };
        placed.push({ id: m.id, box });
        break;
      }
      if (chosen) break;
    }
    out.set(m.id, chosen ?? { side: sides[0]!, dy: 0 });
  }
  return out;
}

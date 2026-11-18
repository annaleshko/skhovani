/** Hall layouts in Figma design px (wall height = 844). */

export type HallRect = { x: number; y: number; w: number; h: number };

export type HallSlot = {
  artworkId: number;
  /** Outer frame+painting bounds on the wall. */
  frameRect: HallRect;
  /** Lamp left edge in design px (only shown for the opened slot). */
  lampX: number;
  /** Transparent frame+painting from art/<name>.png. */
  frameSrc: string;
  /** Optional blackened preview from hidden art/ (12б / covered look). */
  hiddenSrc?: string;
};

export type HallLayout = {
  museumId: string;
  designWidth: number;
  designHeight: number;
  wallSrc: string;
  lamp: { w: number; h: number; y: number };
  /** Figma projector 92:4276 — fixed 353×745, top y 99, centered on lamp. */
  cone: { w: number; h: number; y: number };
  /** Absolute Y for captions under each frame (Kherson wall). */
  captions: { titleY: number; metaY: number; badgeY: number };
  slots: HallSlot[];
};

/** Artwork IDs that have a `hidden art/<name>.png` export. */
const HIDDEN_FRAME_IDS = new Set([2, 4, 5, 6, 7]);

function framePaths(id: number): Pick<HallSlot, "frameSrc" | "hiddenSrc"> {
  const frameSrc = `/hall/frames/${id}.webp`;
  if (HIDDEN_FRAME_IDS.has(id)) {
    return { frameSrc, hiddenSrc: `/hall/frames/${id}-hidden.webp` };
  }
  return { frameSrc };
}

/**
 * Kherson wall + frames from Figma `156:15129` / screen `92:4217`.
 * Coords are relative to the wall image (1659×844).
 * Lamps at y 45, x ≈ 133, 432, 673, 936, 1222, 1477.
 */
export const hallLayouts: Record<string, HallLayout> = {
  kherson: {
    museumId: "kherson",
    designWidth: 1659,
    designHeight: 844,
    wallSrc: "/halls/kherson/wall.webp",
    lamp: { w: 98, h: 72, y: 45 },
    cone: { w: 353, h: 745, y: 99 },
    captions: { titleY: 499, metaY: 527, badgeY: 571 },
    slots: [
      {
        artworkId: 4,
        frameRect: { x: 71, y: 303, w: 232, h: 169 },
        lampX: 133,
        ...framePaths(4),
      },
      {
        artworkId: 6,
        frameRect: { x: 351, y: 302, w: 254, h: 165 },
        lampX: 432,
        ...framePaths(6),
      },
      {
        artworkId: 7,
        frameRect: { x: 653, y: 264, w: 151, h: 213 },
        lampX: 673,
        ...framePaths(7),
      },
      {
        artworkId: 1,
        frameRect: { x: 866, y: 298, w: 232, h: 180 },
        lampX: 936,
        ...framePaths(1),
      },
      {
        artworkId: 2,
        frameRect: { x: 1142, y: 298, w: 244, h: 180 },
        lampX: 1222,
        ...framePaths(2),
      },
      {
        artworkId: 5,
        frameRect: { x: 1442, y: 285, w: 154, h: 205 },
        lampX: 1477,
        ...framePaths(5),
      },
    ],
  },
  /** Melitopol — Figma `171:6608`, single centered work on vertical wall. */
  melitopol: {
    museumId: "melitopol",
    designWidth: 390,
    designHeight: 844,
    wallSrc: "/halls/melitopol/wall.webp",
    lamp: { w: 98, h: 72, y: 45 },
    cone: { w: 353, h: 745, y: 99 },
    captions: { titleY: 170, metaY: 198, badgeY: 254 },
    slots: [
      {
        artworkId: 3,
        frameRect: { x: 25, y: 273, w: 340, h: 571 },
        lampX: 153,
        ...framePaths(3),
      },
    ],
  },
  /** Kharkiv — Figma `169:6425`. */
  kharkiv: {
    museumId: "kharkiv",
    designWidth: 390,
    designHeight: 844,
    wallSrc: "/halls/kharkiv/wall.webp",
    lamp: { w: 98, h: 72, y: 45 },
    cone: { w: 353, h: 745, y: 99 },
    captions: { titleY: 469, metaY: 521, badgeY: 571 },
    slots: [
      {
        artworkId: 8,
        frameRect: { x: 29, y: 232, w: 332, h: 213 },
        lampX: 153,
        ...framePaths(8),
      },
    ],
  },
  /** Chernihiv — Figma `170:6497`. */
  chernihiv: {
    museumId: "chernihiv",
    designWidth: 390,
    designHeight: 844,
    wallSrc: "/halls/chernihiv/wall.webp",
    lamp: { w: 98, h: 72, y: 45 },
    cone: { w: 353, h: 745, y: 99 },
    captions: { titleY: 469, metaY: 497, badgeY: 571 },
    slots: [
      {
        artworkId: 10,
        frameRect: { x: 80, y: 165, w: 230, h: 285 },
        lampX: 153,
        ...framePaths(10),
      },
    ],
  },
  /** Lviv — Figma `171:6570`. */
  lviv: {
    museumId: "lviv",
    designWidth: 390,
    designHeight: 844,
    wallSrc: "/halls/lviv/wall.webp",
    lamp: { w: 98, h: 72, y: 45 },
    cone: { w: 353, h: 745, y: 99 },
    captions: { titleY: 469, metaY: 497, badgeY: 571 },
    slots: [
      {
        artworkId: 9,
        frameRect: { x: 29, y: 232, w: 332, h: 213 },
        lampX: 153,
        ...framePaths(9),
      },
    ],
  },
};

export function getHallLayout(museumId: string): HallLayout | undefined {
  return hallLayouts[museumId];
}

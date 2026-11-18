/**
 * Figma `100:1657` «Картина в рамі»:
 * Рама `100:1658` image crop w 125.47% / h 119.82% / left −12.91% / top −8.66%
 * Картина `100:1659` object-cover in the inner opening.
 * Lamp `100:1661`, cone `100:1660` on tour screen `100:1655`.
 */
export const TOUR_FRAME_CROP = {
  width: "125.47%",
  height: "119.82%",
  left: "-12.91%",
  top: "-8.66%",
} as const;

/** Design positions on 390×844 tour screen (100:1655). */
export const TOUR_LAYOUT = {
  frame: { x: 24, y: 194, w: 341.56, h: 265 },
  painting: { x: 60.81, y: 230.81, w: 266.47, h: 195.81 },
  lamp: { x: 146, y: 8, w: 98, h: 109 },
  cone: { x: 13, y: 432, w: 346, h: 324 },
} as const;

/** Figma 16 · Паспорт / 08 · Detail (240:1838 / 236:1564), 390×844. */
export const PASSPORT_LAYOUT = {
  header: { y: 44, h: 64 },
  iconBtn: { size: 40, xClose: 24, xPlay: 326 },
  lamp: { y: -42, w: 98, h: 109 },
  cone: { w: 346, h: 380 },
  frame: { x: 24, y: 125, w: 342, h: 265 },
  credit: { y: 400 },
  hint: { y: 424 },
  sheetCollapsed: { y: 464 },
  sheetExpanded: { y: 112 },
  dim: { y: 440 },
  card: { x: 24, y: 500, w: 342 },
  actions: { y: 724, h: 88 },
} as const;

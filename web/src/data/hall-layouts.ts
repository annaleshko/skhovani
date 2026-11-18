/** Hall layouts in Figma design px (wall height = 844). */

export type HallRect = { x: number; y: number; w: number; h: number };

export type HallSlot = {
  artworkId: number;
  /** Outer frame group bounds on the wall. */
  frameRect: HallRect;
  /** Painting area inside the frame (for covered dark overlay). */
  paintingRect: HallRect;
  /** Composed frame+painting export render. */
  frameSrc: string;
};

export type HallLayout = {
  museumId: string;
  designWidth: number;
  designHeight: number;
  wallSrc: string;
  lamp: { w: number; h: number; y: number };
  cone: { w: number; h: number };
  slots: HallSlot[];
};

/**
 * Kherson wall + frames from Figma `156:15129` / screen `92:4217`.
 * Coords are relative to the wall image (1659×844), not the empty canvas strip.
 */
export const hallLayouts: Record<string, HallLayout> = {
  kherson: {
    museumId: "kherson",
    designWidth: 1659,
    designHeight: 844,
    wallSrc: "/halls/kherson/wall.webp",
    lamp: { w: 98, h: 72, y: 45 },
    cone: { w: 353, h: 745 },
    slots: [
      {
        artworkId: 4,
        frameRect: { x: 71, y: 303, w: 232, h: 169 },
        paintingRect: { x: 93, y: 327, w: 187, h: 124 },
        frameSrc: "/halls/kherson/frames/4.webp",
      },
      {
        artworkId: 6,
        frameRect: { x: 351, y: 302, w: 254, h: 165 },
        paintingRect: { x: 371, y: 323, w: 215, h: 124 },
        frameSrc: "/halls/kherson/frames/6.webp",
      },
      {
        artworkId: 7,
        frameRect: { x: 653, y: 264, w: 151, h: 213 },
        paintingRect: { x: 665, y: 276, w: 127, h: 188 },
        frameSrc: "/halls/kherson/frames/7.webp",
      },
      {
        artworkId: 1,
        frameRect: { x: 866, y: 298, w: 232, h: 180 },
        paintingRect: { x: 891, y: 323, w: 181, h: 133 },
        frameSrc: "/halls/kherson/frames/1.webp",
      },
      {
        artworkId: 2,
        frameRect: { x: 1142, y: 298, w: 244, h: 180 },
        paintingRect: { x: 1162, y: 317, w: 203, h: 141 },
        frameSrc: "/halls/kherson/frames/2.webp",
      },
      {
        artworkId: 5,
        frameRect: { x: 1442, y: 285, w: 154, h: 205 },
        paintingRect: { x: 1465, y: 320, w: 112, h: 140 },
        frameSrc: "/halls/kherson/frames/5.webp",
      },
    ],
  },
  // Single-artwork museums: reuse phone-frame hall until dedicated wall exports exist
  melitopol: {
    museumId: "melitopol",
    designWidth: 390,
    designHeight: 844,
    wallSrc: "/halls/melitopol/hall.webp",
    lamp: { w: 98, h: 72, y: 45 },
    cone: { w: 353, h: 745 },
    slots: [
      {
        artworkId: 3,
        frameRect: { x: 25, y: 273, w: 340, h: 400 },
        paintingRect: { x: 40, y: 290, w: 310, h: 360 },
        frameSrc: "/halls/melitopol/hall.webp",
      },
    ],
  },
  kharkiv: {
    museumId: "kharkiv",
    designWidth: 390,
    designHeight: 844,
    wallSrc: "/halls/kharkiv/hall.webp",
    lamp: { w: 98, h: 72, y: 45 },
    cone: { w: 353, h: 745 },
    slots: [
      {
        artworkId: 8,
        frameRect: { x: 29, y: 232, w: 332, h: 213 },
        paintingRect: { x: 55, y: 259, w: 280, h: 160 },
        frameSrc: "/halls/kharkiv/hall.webp",
      },
    ],
  },
  chernihiv: {
    museumId: "chernihiv",
    designWidth: 390,
    designHeight: 844,
    wallSrc: "/halls/chernihiv/hall.webp",
    lamp: { w: 98, h: 72, y: 45 },
    cone: { w: 353, h: 745 },
    slots: [
      {
        artworkId: 10,
        frameRect: { x: 80, y: 165, w: 230, h: 285 },
        paintingRect: { x: 100, y: 185, w: 190, h: 244 },
        frameSrc: "/halls/chernihiv/hall.webp",
      },
    ],
  },
  lviv: {
    museumId: "lviv",
    designWidth: 390,
    designHeight: 844,
    wallSrc: "/halls/lviv/hall.webp",
    lamp: { w: 98, h: 72, y: 45 },
    cone: { w: 353, h: 745 },
    slots: [
      {
        artworkId: 9,
        frameRect: { x: 29, y: 232, w: 332, h: 213 },
        paintingRect: { x: 55, y: 256, w: 280, h: 163 },
        frameSrc: "/halls/lviv/hall.webp",
      },
    ],
  },
};

export function getHallLayout(museumId: string): HallLayout | undefined {
  return hallLayouts[museumId];
}

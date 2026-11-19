import { assetMap } from "./asset-map";
import { getMuseum } from "./index";

/** Native facade export size (390×844 @2×). */
export const FACADE_NATIVE_W = 780;
export const FACADE_NATIVE_H = 1688;
/** Design aspect for width-fit facade layout (no object-fit crop). */
export const FACADE_ASPECT = 844 / 390;

/** Facade + hall UI for journey screen 11 / enter animation. */
export type MuseumUi = {
  id: string;
  facadeSrc: string;
  hallSrc: string;
  /** Display title for UI (Figma spelling, e.g. «імені» not «ім.»). */
  displayName: string;
  /**
   * Transform-origin for the enter zoom (%, of facade image).
   * Door hint UI was removed; whole facade is tappable.
   */
  doorX: number;
  doorY: number;
  /** Building roof as a fraction of image height (measured WebP). */
  facadeTop: number;
  /** Building ground line as a fraction of image height (measured WebP). */
  facadeGround: number;
  /** Top-left pixel of the facade export — fill above/below so no seam shows. */
  facadeFill: string;
};

/**
 * Full-screen facade exports (390×844 @2× → /museums/<id>.webp).
 * facadeTop / facadeGround measured from the WebP exports.
 */
export const museumUi: Record<string, MuseumUi> = {
  kherson: {
    id: "kherson",
    facadeSrc: assetMap.museums.kherson.facade,
    hallSrc: assetMap.museums.kherson.hall,
    displayName: "Херсонський обласний художній музей імені Олексія Шовкуненка",
    doorX: 50,
    doorY: 45,
    facadeTop: 0.19,
    facadeGround: 0.59,
    facadeFill: "#0e0c0b",
  },
  melitopol: {
    id: "melitopol",
    facadeSrc: assetMap.museums.melitopol.facade,
    hallSrc: assetMap.museums.melitopol.hall,
    displayName: "Мелітопольський краєзнавчий музей",
    doorX: 50,
    doorY: 45,
    facadeTop: 0.28,
    facadeGround: 0.61,
    facadeFill: "#0d0503",
  },
  kharkiv: {
    id: "kharkiv",
    facadeSrc: assetMap.museums.kharkiv.facade,
    hallSrc: assetMap.museums.kharkiv.hall,
    displayName: "Харківський художній музей",
    doorX: 50,
    doorY: 45,
    facadeTop: 0.26,
    facadeGround: 0.65,
    facadeFill: "#0d0503",
  },
  lviv: {
    id: "lviv",
    facadeSrc: assetMap.museums.lviv.facade,
    hallSrc: assetMap.museums.lviv.hall,
    displayName: "Національний музей у Львові імені Андрея Шептицького",
    doorX: 50,
    doorY: 45,
    facadeTop: 0.22,
    facadeGround: 0.62,
    facadeFill: "#0d0503",
  },
  chernihiv: {
    id: "chernihiv",
    facadeSrc: assetMap.museums.chernihiv.facade,
    hallSrc: assetMap.museums.chernihiv.hall,
    displayName: "Чернігівський обласний художній музей імені Григорія Галагана",
    doorX: 50,
    doorY: 45,
    facadeTop: 0.28,
    facadeGround: 0.64,
    facadeFill: "#0d0503",
  },
};

export function getMuseumUi(museumId: string): MuseumUi | undefined {
  return museumUi[museumId];
}

export function getMuseumShortLabel(museumId: string): string {
  const m = getMuseum(museumId);
  if (!m) return museumId;
  return m.city;
}

export function getMuseumDisplayName(museumId: string): string {
  return museumUi[museumId]?.displayName ?? getMuseum(museumId)?.fullName ?? museumId;
}

import { assetMap } from "./asset-map";
import { getMuseum } from "./index";

/** Door hotspot on facade image, in % of width/height. */
export type MuseumUi = {
  id: string;
  facadeSrc: string;
  hallSrc: string;
  /** Display title for UI (Figma spelling, e.g. «імені» not «ім.»). */
  displayName: string;
  doorX: number;
  doorY: number;
  /**
   * CSS object-position for facade crop.
   * Kherson from Figma 87:3618 (image scaled ~134.6%, top −34.55% → building in frame).
   */
  facadeObjectPosition: string;
  /**
   * Figma absolute crop inside the facade frame (87:3618).
   * When set, image is positioned with these % instead of fill+object-cover alone.
   */
  facadeImageHeight?: string;
  facadeImageTop?: string;
};

/**
 * Door positions for facade tap / camera enter.
 * Kherson from Figma 11 (pin ≈ 122×456 on 389×629 facade at y=119).
 */
export const museumUi: Record<string, MuseumUi> = {
  kherson: {
    id: "kherson",
    facadeSrc: assetMap.museums.kherson.facade,
    hallSrc: assetMap.museums.kherson.hall,
    displayName: "Херсонський обласний художній музей імені Олексія Шовкуненка",
    // Figma 87:3585 pin at 122×456 on facade (y=119, 389×629) → % of facade
    doorX: 31.4,
    doorY: 53.6,
    // Figma 87:3618 («image 46»): h-[134.6%] top-[-34.55%]
    facadeObjectPosition: "50% 42%",
    facadeImageHeight: "134.6%",
    facadeImageTop: "-34.55%",
  },
  melitopol: {
    id: "melitopol",
    facadeSrc: assetMap.museums.melitopol.facade,
    hallSrc: assetMap.museums.melitopol.hall,
    displayName: "Мелітопольський міський краєзнавчий музей",
    // TODO(door): calibrate Melitopol facade door
    doorX: 50,
    doorY: 60,
    // TODO(facade): calibrate Melitopol crop
    facadeObjectPosition: "50% 80%",
  },
  kharkiv: {
    id: "kharkiv",
    facadeSrc: assetMap.museums.kharkiv.facade,
    hallSrc: assetMap.museums.kharkiv.hall,
    displayName: "Харківський художній музей",
    // TODO(door): calibrate Kharkiv facade door
    doorX: 50,
    doorY: 60,
    // TODO(facade): calibrate Kharkiv crop
    facadeObjectPosition: "50% 80%",
  },
  lviv: {
    id: "lviv",
    facadeSrc: assetMap.museums.lviv.facade,
    hallSrc: assetMap.museums.lviv.hall,
    displayName: "Національний музей у Львові імені Андрея Шептицького",
    // TODO(door): calibrate Lviv facade door
    doorX: 50,
    doorY: 60,
    // TODO(facade): calibrate Lviv crop
    facadeObjectPosition: "50% 80%",
  },
  chernihiv: {
    id: "chernihiv",
    facadeSrc: assetMap.museums.chernihiv.facade,
    hallSrc: assetMap.museums.chernihiv.hall,
    displayName: "Чернігівський обласний художній музей імені Григорія Галагана",
    // TODO(door): calibrate Chernihiv facade door
    doorX: 50,
    doorY: 60,
    // TODO(facade): calibrate Chernihiv crop
    facadeObjectPosition: "50% 80%",
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

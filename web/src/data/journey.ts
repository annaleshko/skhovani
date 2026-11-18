import type { City } from "./cities";
import { getArtwork, getContent, getMuseum } from "./index";
import {
  ABROAD_CITY,
  getStartCityOption,
  isAbroadCityId,
} from "./start-cities";
import type { Artwork, JourneyPath, Museum } from "./types";

export type ResolvedPath = JourneyPath & {
  artwork: Artwork;
  museum: Museum;
};

function isSkippable(path: JourneyPath): boolean {
  if (!path.skipIfNoImage) return false;
  const artwork = getArtwork(path.artworkId);
  return !artwork?.image;
}

export function getPaths(): JourneyPath[] {
  return getContent().journey.paths.filter((p) => !isSkippable(p));
}

export function getPath(n: number): ResolvedPath | undefined {
  const path = getPaths().find((p) => p.n === n);
  if (!path) return undefined;
  const artwork = getArtwork(path.artworkId);
  const museum = getMuseum(path.museumId);
  if (!artwork || !museum) return undefined;
  return { ...path, artwork, museum };
}

/** Next incomplete path after the highest completed path number. */
export function getNextPath(completedPaths: number[]): ResolvedPath | undefined {
  const done = new Set(completedPaths);
  const next = getPaths().find((p) => !done.has(p.n));
  if (!next) return undefined;
  return getPath(next.n);
}

/** Last completed path in journey order, if any. */
export function getLastCompletedPath(
  completedPaths: number[],
): ResolvedPath | undefined {
  if (completedPaths.length === 0) return undefined;
  const n = Math.max(...completedPaths);
  return getPath(n);
}

/** Same-museum consecutive paths skip the map (paths 6–10 in Kherson). */
export function shouldSkipMapToHall(
  completedPaths: number[],
  next: ResolvedPath,
): boolean {
  const prev = getLastCompletedPath(completedPaths);
  return Boolean(prev && prev.museumId === next.museumId);
}

/**
 * Map origin for a path: chosen city (path 1) or previous museum (n>1).
 * Abroad → west of the map at the target museum's latitude; label «Ти».
 */
export function getPathOrigin(
  startCityId: string | null,
  path: ResolvedPath,
  completedPaths: number[],
): { city: City; abroad: boolean } {
  const abroad = isAbroadCityId(startCityId);
  if (path.n > 1) {
    const prev = getLastCompletedPath(completedPaths);
    if (prev) {
      return {
        city: {
          id: prev.museumId,
          name: prev.museum.city,
          oblast: "",
          lat: prev.museum.lat,
          lng: prev.museum.lng,
        },
        abroad: false,
      };
    }
  }
  if (abroad) {
    return {
      city: {
        ...ABROAD_CITY,
        lat: path.museum.lat,
        // West of Ukraine map extent — pin sits off the left edge.
        lng: 21.0,
      },
      abroad: true,
    };
  }
  const city = startCityId ? getStartCityOption(startCityId) : undefined;
  return {
    city: city ?? ABROAD_CITY,
    abroad: false,
  };
}

export function getOpenedArtworks(completedPaths: number[]): Artwork[] {
  const ids = new Set(
    getPaths()
      .filter((p) => completedPaths.includes(p.n))
      .map((p) => p.artworkId),
  );
  return getContent().artworks.filter((a) => ids.has(a.id));
}

export function isJourneyComplete(completedPaths: number[]): boolean {
  return getPaths().every((p) => completedPaths.includes(p.n));
}

/** Copy shown when every path is done. */
// TODO(copy): confirm final «all done» copy with Anna
export const ALL_DONE_COPY = {
  title: "Усі шляхи пройдено",
  body: "Твоє сузір’я зібране. Повертайся до творів у колекції.",
} as const;

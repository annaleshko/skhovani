import { getArtwork, getContent, getMuseum } from "./index";
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

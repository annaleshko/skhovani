import raw from "./content.json";
import type { Artwork, Content, Museum, Source } from "./types";

const content = raw as unknown as Content;

export function getContent(): Content {
  return content;
}

export function getArtworks(): Artwork[] {
  return content.artworks;
}

export function getArtwork(idOrSlug: number | string): Artwork | undefined {
  if (typeof idOrSlug === "number") {
    return content.artworks.find((a) => a.id === idOrSlug);
  }
  return content.artworks.find((a) => a.slug === idOrSlug);
}

export function getMuseums(): Museum[] {
  return content.museums;
}

export function getMuseum(id: string): Museum | undefined {
  return content.museums.find((m) => m.id === id);
}

export function getArtworksByMuseum(museumId: string): Artwork[] {
  return content.artworks.filter((a) => a.museumId === museumId);
}

export function getSource(artworkId: number, sourceId: string): Source | undefined {
  const artwork = getArtwork(artworkId);
  if (!artwork) return undefined;
  const fromPassport = artwork.sources.find((s) => s.id === sourceId);
  if (fromPassport) return fromPassport;
  // extendedKnowledge chips (xk_…)
  const ext = artwork.extendedKnowledge?.find((e) => e.sourceId === sourceId);
  if (!ext) return undefined;
  return {
    id: ext.sourceId,
    label: ext.sourceLabel ?? ext.sourceId,
    url: null,
    note: null,
  };
}

export function getChatRules(): string {
  return content.chatRules;
}

export { content };

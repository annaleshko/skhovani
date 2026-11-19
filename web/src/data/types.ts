export type ArtworkStatus = "stolen" | "shelter" | "saved" | "lost";

export type Source = {
  id: string;
  label: string;
  url: string | null;
  note: string | null;
};

export type TourStop = {
  n: number;
  title: string;
  locationHint: string;
  text: string;
  x: number | null;
  y: number | null;
  zoom: number | null;
};

export type TouchZone = {
  position: string;
  label: string;
  title: string;
  text: string;
  /** Optional point on the composed image (0–1). Falls back to grid cell center. */
  x?: number | null;
  y?: number | null;
};

export type TouchZones = {
  grid: "3x3" | "3x2" | "custom";
  note: string | string[];
  zones: TouchZone[];
};

/** Passport «База знань» row — source pointer + how the guide may use it. */
export type KnowledgeBaseEntry = {
  source: string;
  url: string | null;
  sourceId: string | null;
  use: string;
};

export type ArtworkChat = {
  defaultQuestions: string[];
  knowledgeBase: KnowledgeBaseEntry[];
  aiNotes: string;
};

/** Optional verified facts beyond the passport (imported from docs/guide-knowledge-extra.md). */
export type ExtendedKnowledgeFact = {
  fact: string;
  sourceId: string;
  /** Soft source — phrase as «за даними <sourceLabel>». */
  verify?: boolean;
  sourceLabel?: string;
  /**
   * `context` — topic-level facts from «# Ширший контекст»
   * (say «Якщо говорити ширше…» and cite the source).
   * `story` — living stories from «# Раунд 2» (prefer for «розкажи щось цікаве»).
   */
  scope?: "context" | "story";
};

export type ArtworkTabs = {
  history: string[];
  about: string[];
  author: string[];
};

export type SourceAssets = {
  image: string | null;
  wallpaper: string | null;
  imageAlt?: string | null;
};

export type Artwork = {
  id: number;
  slug: string;
  title: string;
  headline: string;
  author: string;
  authorYears: string | null;
  year: string;
  status: ArtworkStatus;
  statusRaw: string;
  museum: string;
  museumId: string;
  photoCredit: string;
  image: string | null;
  wallpaper: string | null;
  notes: string[];
  tabs: ArtworkTabs;
  touchZones: TouchZones;
  tourStops: TourStop[];
  sources: Source[];
  chat: ArtworkChat;
  /** Extra verified facts for the guide — passport + these only. */
  extendedKnowledge?: ExtendedKnowledgeFact[];
  openQuestions: string;
  sourceAssets: SourceAssets;
};

export type MuseumSourceAssets = {
  facade: string;
  hall: string;
  hallTodo?: string;
};

export type Museum = {
  id: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  occupied?: boolean;
  artworkIds: number[];
  sourceAssets: MuseumSourceAssets;
  fullName: string;
};

export type JourneyPath = {
  n: number;
  museumId: string;
  artworkId: number;
  skipIfNoImage?: boolean;
};

export type Journey = {
  note: string;
  paths: JourneyPath[];
};

export type Content = {
  chatRules: string;
  artworks: Artwork[];
  museums: Museum[];
  journey: Journey;
};

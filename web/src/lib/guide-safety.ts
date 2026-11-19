/**
 * Hard safety for the guide chat — status-aware location rules.
 */

import type { Artwork, ArtworkStatus } from "@/data/types";

const SAFE_SHELTER =
  "Твір в укритті. Точне місце зберігання я не називаю і не вгадую.";

const SAFE_SAVED =
  "Твір врятовано. Точне місце зберігання я не називаю і не вгадую.";

const SAFE_STOLEN =
  "Окупанти вивезли цей твір з музею. Точне місце зараз невідоме.";

/** Concrete facility / invented-storage guesses (blocked for all statuses). */
const UNSAFE_FACILITY =
  /\b(склад|схрон|бункер|підвал|сейф|сховищ[аі]?|хранят|зберіга(ється|ють)\s+у\s+[А-Яа-яІіЇїЄєA-Za-z])/iu;

/**
 * For shelter/saved: also block naming a current storage destination.
 * «вивезли до Росії» is OK for stolen (passport fact); blocked for shelter/saved.
 */
const UNSAFE_SHELTER_DESTINATION =
  /\b(вивезл[аи]\s+до\s+[А-Яа-яІіЇїЄєA-Za-z]|знаход(иться|яться)\s+(зараз\s+)?в\s+(Росії|Криму)|зараз\s+в\s+(Росії|Криму)|в Криму в |у Криму в )/iu;

export function looksLikeLocationLeak(
  text: string,
  status: ArtworkStatus = "stolen",
): boolean {
  if (UNSAFE_FACILITY.test(text)) return true;
  if (status === "shelter" || status === "saved") {
    return UNSAFE_SHELTER_DESTINATION.test(text);
  }
  return false;
}

export function sanitizeGuideAnswer(
  text: string,
  status: ArtworkStatus = "stolen",
): string {
  if (!looksLikeLocationLeak(text, status)) return text.trim();
  if (status === "stolen") return SAFE_STOLEN;
  if (status === "shelter") return SAFE_SHELTER;
  if (status === "saved") return SAFE_SAVED;
  return SAFE_SHELTER;
}

export const GUIDE_SAFE_SHELTER = SAFE_SHELTER;
export const GUIDE_SAFE_SAVED = SAFE_SAVED;
export const GUIDE_SAFE_STOLEN = SAFE_STOLEN;

/** Trap / location questions — answer from passport without inventing a place. */
export function isLocationTrapQuestion(q: string): boolean {
  const t = q.toLowerCase();
  return (
    /де\s+(зараз|вона|він|це|твір|картин)/i.test(t) ||
    /де\s+зберіга/i.test(t) ||
    /куди\s+(вивез|подів|схов)/i.test(t) ||
    /where\s+is/i.test(t)
  );
}

/** Model shrugged despite passport likely covering the topic. */
export function looksLikeNoDataShrug(text: string): boolean {
  return /немає\s+(в\s+)?(моїх\s+)?джерел|в\s+моїх\s+джерелах\s+даних\s+немає|джерелах\s+даних\s+немає/i.test(
    text,
  );
}

/**
 * Speculative symbolism / opinions not grounded in the passport.
 * Triggers a stricter retry, then curated/fallback bank.
 */
export function looksLikeSpeculation(text: string): boolean {
  return (
    /може\s+символізувати/i.test(text) ||
    /символізує/i.test(text) ||
    /\bймовірно\b/i.test(text) ||
    /\bмабуть\b/i.test(text) ||
    /можливо,\s+це\s+означає/i.test(text) ||
    /натякає\s+на/i.test(text)
  );
}

/** Digit tokens (years, counts, sizes) — commas normalized to dots. */
export function extractNumberTokens(text: string): string[] {
  const out: string[] = [];
  for (const m of text.match(/\d+(?:[.,]\d+)?/g) ?? []) {
    out.push(m.replace(",", "."));
  }
  return out;
}

/** Passport tabs + extended facts + sources — the only corpus for grounded numbers. */
export function artworkKnowledgeCorpus(artwork: Artwork): string {
  const parts: string[] = [
    artwork.title,
    artwork.headline,
    artwork.author,
    artwork.year,
    artwork.statusRaw,
    artwork.museum,
    artwork.openQuestions,
    artwork.chat.aiNotes,
    ...artwork.tabs.history,
    ...artwork.tabs.about,
    ...artwork.tabs.author,
    ...artwork.tourStops.map((s) => `${s.title}\n${s.text}`),
    ...artwork.touchZones.zones.map((z) => `${z.title}\n${z.text}`),
    ...artwork.chat.knowledgeBase.map(
      (k) => `${k.source}\n${k.use}${k.url ? `\n${k.url}` : ""}`,
    ),
    ...(artwork.extendedKnowledge ?? []).map((e) => e.fact),
    ...artwork.sources.map(
      (s) => `${s.label}\n${s.note ?? ""}\n${s.url ?? ""}`,
    ),
  ];
  return parts.join("\n");
}

/** Numbers in the answer that never appear in the knowledge corpus. */
export function ungroundedNumbers(answer: string, knowledge: string): string[] {
  const known = new Set(extractNumberTokens(knowledge));
  const used = extractNumberTokens(answer);
  return [...new Set(used)].filter((n) => !known.has(n));
}

export function answerHasUngroundedNumbers(
  answer: string,
  knowledge: string,
): boolean {
  return ungroundedNumbers(answer, knowledge).length > 0;
}

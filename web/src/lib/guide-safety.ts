/**
 * Hard safety for the guide chat — status-aware location rules.
 */

import type { ArtworkStatus } from "@/data/types";

const SAFE_SHELTER =
  "Твір в укритті. Точне місце зберігання я не називаю і не вгадую.";

const SAFE_STOLEN =
  "Окупанти вивезли її з музею. Точне місце зараз невідоме.";

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
  if (status === "shelter" || status === "saved") return SAFE_SHELTER;
  return SAFE_SHELTER;
}

export const GUIDE_SAFE_SHELTER = SAFE_SHELTER;
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

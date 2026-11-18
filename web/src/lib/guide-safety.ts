/**
 * Hard safety for the guide chat — never name storage of evacuated works.
 */

const SAFE_SHELTER =
  "Твір в укритті. Точне місце зберігання я не називаю і не вгадую.";

/** Phrases that look like a concrete storage / destination guess. */
const UNSAFE_LOCATION =
  /\b(склад|схрон|бункер|підвал|сейф|сховищ|хранят|зберіга(ється|ють)\s+у|вивезл[аи]\s+до\s+[А-Яа-яІіЇїЄєA-Za-z]|знаход(иться|яться)\s+(зараз\s+)?в\s+(Росії|Криму)|зараз\s+в\s+(Росії|Криму)|в Криму в |у Криму в )/iu;

export function looksLikeLocationLeak(text: string): boolean {
  return UNSAFE_LOCATION.test(text);
}

export function sanitizeGuideAnswer(text: string): string {
  if (looksLikeLocationLeak(text)) return SAFE_SHELTER;
  return text.trim();
}

export const GUIDE_SAFE_SHELTER = SAFE_SHELTER;

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

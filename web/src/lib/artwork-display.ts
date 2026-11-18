import type { Artwork } from "@/data/types";

/** Short UI title — never the long passport `title` with registry notes. */
export function displayHeadline(artwork: Artwork): string {
  const h = (artwork.headline || artwork.title).trim();
  const dash = h.indexOf(" — ");
  if (dash > 0) return h.slice(0, dash).trim();
  return h;
}

function isUnknownYear(year: string): boolean {
  const y = year.trim();
  if (!y) return true;
  // Whole value unknown, or only «не встановлено…» with no real date.
  if (/^не\s+встановлено\b/i.test(y)) return true;
  if (/^датування\b.*не\s+встановлен/i.test(y)) return true;
  return false;
}

/**
 * First date part of passport `year` for meta lines («Автор · рік»).
 * Cuts at «;» or «(»; strips «колекція —» / find-year; "" if unknown.
 */
export function displayYear(year: string): string {
  const y = year.trim();
  if (isUnknownYear(y)) return "";
  // First segment before «;» or «(»
  let s = y;
  const semi = s.indexOf(";");
  if (semi > 0) s = s.slice(0, semi);
  const paren = s.indexOf("(");
  if (paren > 0) s = s.slice(0, paren);
  s = s.trim();
  s = s.replace(/^колекція\s*[—–-]\s*/i, "");
  s = s.replace(/,?\s*знайдена?\s+у\s+\d{4}/i, "");
  // «1846» / «1889–1896» / «IV ст. до н. е.» / «XVII ст.»
  s = s.replace(/\s+/g, " ").trim();
  // Drop trailing material notes after comma when not century text
  if (/^\d/.test(s)) {
    const comma = s.indexOf(",");
    if (comma > 0) s = s.slice(0, comma).trim();
  }
  if (isUnknownYear(s)) return "";
  return s || "";
}

/**
 * Status date next to the badge — per-artwork from the passport.
 * Omit when unknown (never a shared default).
 */
const STATUS_META_BY_ID: Record<number, string> = {
  1: "восени 2022", // Великодня
  2: "восени 2022", // Колядки
  3: "квітень 2022", // Скіфське золото
  4: "восени 2022", // Одеса
  5: "восени 2022", // Дама
  6: "восени 2022", // Околиці
  7: "восени 2022", // Капуцин
  8: "з 2022 року", // Запорожці
  9: "з 2022 року", // Іконостас
  10: "2022, облога Чернігова", // Козак-бандурист
};

export function displayStatusMeta(artwork: Artwork): string {
  return STATUS_META_BY_ID[artwork.id] ?? "";
}

/** Short author for UI meta (passport short form). */
export function displayAuthor(artwork: Artwork): string {
  if (artwork.id === 9) return "Йов Кондзелевич та помічники";
  return artwork.author
    .replace(/\s*\(\d{4}\s*[–-]\s*\d{4}\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** «Автор» or «Автор · рік» — never « · не встановлено». */
export function displayAuthorMeta(artwork: Artwork): string {
  const year = displayYear(artwork.year);
  const author = displayAuthor(artwork);
  if (!year) return author;
  return `${author} · ${year}`;
}

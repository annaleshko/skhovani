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
  return /^не\s+встановлено\b/i.test(y);
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

/** «Автор» or «Автор · рік» — never « · не встановлено». */
export function displayAuthorMeta(artwork: Artwork): string {
  const year = displayYear(artwork.year);
  if (!year) return artwork.author;
  return `${artwork.author} · ${year}`;
}

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
 * Passport dating for meta lines.
 * Never present a find year (e.g. 1954) as the creation year.
 * Returns "" when year is missing / «не встановлено».
 */
export function displayYear(year: string): string {
  const y = year.trim();
  if (isUnknownYear(y)) return "";
  // «1910 (за даними музею; …)» → 1910
  if (/^\d{4}\b/.test(y)) {
    const paren = y.indexOf("(");
    if (paren > 0) return y.slice(0, paren).trim();
    const semi = y.indexOf(";");
    if (semi > 0) return y.slice(0, semi).trim();
    return y;
  }
  // Collection / century dating — keep the readable clause
  let s = y.split(";")[0]?.trim() ?? y;
  s = s.replace(/^колекція\s*[—–-]\s*/i, "");
  s = s.replace(/,\s*знайдена?\s+у\s+(\d{4})/i, " · знайдено $1");
  s = s.replace(/\s+/g, " ").trim();
  if (isUnknownYear(s)) return "";
  return s || "";
}

/** «Автор» or «Автор · рік» — never « · не встановлено». */
export function displayAuthorMeta(artwork: Artwork): string {
  const year = displayYear(artwork.year);
  if (!year) return artwork.author;
  return `${artwork.author} · ${year}`;
}

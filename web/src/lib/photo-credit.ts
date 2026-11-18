/**
 * Under-artwork credit: photographer only («Фото: <ім'я>»).
 * Full credit stays in Джерела → ФОТО (CC BY).
 */
export function photographerCreditLine(photoCredit: string): string | null {
  const raw = photoCredit.trim();
  if (!raw) return null;
  const m = raw.match(/Фото:\s*(.+)$/iu);
  if (!m) return null;
  let name = m[1].trim();
  const cut = name.search(/\s*[/,]/u);
  if (cut >= 0) name = name.slice(0, cut).trim();
  if (!name) return null;
  return `Фото: ${name}`;
}

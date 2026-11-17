/** Build «Твір XVII століття» style line from a year string. */
export function eraLineFromYear(year: string): string {
  // TODO(era): prefer passport era field when present
  const m = year.match(/(\d{3,4})/);
  if (!m) return "Твір"; // TODO(copy): generic era fallback
  const y = parseInt(m[1], 10);
  const century = Math.ceil(y / 100);
  return `Твір ${toRoman(century)} століття`;
}

function toRoman(n: number): string {
  const map: [number, string][] = [
    [20, "XX"],
    [19, "XIX"],
    [18, "XVIII"],
    [17, "XVII"],
    [16, "XVI"],
    [15, "XV"],
    [14, "XIV"],
    [13, "XIII"],
    [12, "XII"],
    [11, "XI"],
    [10, "X"],
    [9, "IX"],
    [8, "VIII"],
    [7, "VII"],
    [6, "VI"],
    [5, "V"],
    [4, "IV"],
    [3, "III"],
    [2, "II"],
    [1, "I"],
  ];
  for (const [v, r] of map) {
    if (n === v) return r;
  }
  return String(n);
}

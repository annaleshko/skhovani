/**
 * MVP v2 map copy — genitive city names and sheet blurbs.
 * Keep as data maps; do not invent forms in UI strings.
 * Facts from docs/artwork-passports.md / data/artworks.json (first path per museum).
 */

/** Museum id → city in genitive («веде до Херсона»). */
export const MUSEUM_CITY_GENITIVE: Record<string, string> = {
  kherson: "Херсона",
  melitopol: "Мелітополя",
  kharkiv: "Харкова",
  lviv: "Львова",
  chernihiv: "Чернігова",
};

/** Journey museum order for the dashed route on 02в. */
export const JOURNEY_MUSEUM_ORDER = [
  "kherson",
  "melitopol",
  "kharkiv",
  "lviv",
  "chernihiv",
] as const;

export type JourneyMuseumId = (typeof JOURNEY_MUSEUM_ORDER)[number];

/**
 * Screen 02 path-1 sheet body after «≈ N км від тебе.»
 * Path 1 is always Kherson; other keys kept for safety if reused.
 */
export const MUSEUM_PATH_SHEET_BLURB: Record<string, string> = {
  kherson: "Музей пограбували у 2022 році, але ми пам'ятаємо, що тут висіло.",
  // stolen — passport: April 2022, occupiers removed the collection
  melitopol: "У квітні 2022 року окупанти вивезли скіфське золото з музею.",
  // shelter
  kharkiv: "Твір в укритті.",
  // shelter
  lviv: "Твір в укритті.",
  // saved — passport: collection rescued in Feb 2022, no losses
  chernihiv: "Твір врятовано.",
};

/** Screen 02в sheet — one short line for the museum's next unseen artwork. */
export const MUSEUM_ROUTE_SHEET_BLURB: Record<string, string> = {
  kherson: "Великодня заутреня. Музей пограбували у 2022 році, але ми пам'ятаємо, що тут висіло.",
  melitopol: "Скіфське золото. У квітні 2022 року окупанти вивезли його з музею.",
  kharkiv: "Запорожці пишуть листа турецькому султанові. Твір в укритті.",
  lviv: "Богородчанський іконостас. Твір в укритті.",
  chernihiv: "Козак-бандурист. Твір врятовано.",
};

export function cityGenitiveForMuseum(museumId: string): string {
  return MUSEUM_CITY_GENITIVE[museumId] ?? museumId;
}

export function pathSheetBlurb(museumId: string): string {
  return (
    MUSEUM_PATH_SHEET_BLURB[museumId] ??
    // TODO(copy)
    "Музей пограбували у 2022 році, але ми пам'ятаємо, що тут висіло."
  );
}

export function routeSheetBlurb(museumId: string): string {
  return MUSEUM_ROUTE_SHEET_BLURB[museumId] ?? pathSheetBlurb(museumId);
}

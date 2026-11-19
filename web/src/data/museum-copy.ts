/**
 * Map copy — genitive city names and sheet blurbs.
 * Keep as data maps; do not invent forms in UI strings.
 * Facts come from data/artworks.json.
 */

import type { ResolvedPath } from "@/data/journey";
import { displayHeadline } from "@/lib/artwork-display";

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
 * Screen 02 / museum 04 factual line (no «Двері відчинені»).
 * From passports — one line per museum.
 */
export const MUSEUM_PATH_SHEET_BLURB: Record<string, string> = {
  kherson: "Музей пограбували у 2022 році.",
  // stolen — passport: April 2022, occupiers removed the Scythian gold
  melitopol: "У квітні 2022 року окупанти вивезли скіфське золото з музею.",
  // shelter
  kharkiv: "Твір в укритті.",
  // shelter
  lviv: "Твір в укритті.",
  // saved — passport: collection rescued during the Chernihiv siege, Feb 2022
  chernihiv: "Колекцію врятовано під час облоги Чернігова.",
};

/** @deprecated Prefer routeSheetBlurbForPath — kept for museum-only callers. */
export const MUSEUM_ROUTE_SHEET_BLURB: Record<string, string> = {
  kherson:
    "Великодня заутреня. Музей пограбували у 2022 році.",
  melitopol: "Скіфське золото. У квітні 2022 року окупанти вивезли його з музею.",
  kharkiv: "Запорожці пишуть листа турецькому султанові. Твір в укритті.",
  lviv: "Богородчанський іконостас. Твір в укритті.",
  chernihiv: "Козак-бандурист. Колекцію врятовано під час облоги Чернігова.",
};

export function cityGenitiveForMuseum(museumId: string): string {
  return MUSEUM_CITY_GENITIVE[museumId] ?? museumId;
}

export function pathSheetBlurb(museumId: string): string {
  return (
    MUSEUM_PATH_SHEET_BLURB[museumId] ??
    // TODO(copy)
    "Музей пограбували у 2022 році."
  );
}

/** Museum 04 body under the title — factual passport line only. */
export function museumFacadeBlurb(museumId: string): string {
  return pathSheetBlurb(museumId);
}

/**
 * 02в sheet: selected path artwork headline + one museum passport line.
 * Path 6 → «Колядки. Музей пограбували…» (not Великодня).
 */
export function routeSheetBlurbForPath(path: ResolvedPath): string {
  const title = displayHeadline(path.artwork);
  const line = pathSheetBlurb(path.museumId);
  return `${title}. ${line}`;
}

/** @deprecated Use routeSheetBlurbForPath when a path is known. */
export function routeSheetBlurb(museumId: string): string {
  return MUSEUM_ROUTE_SHEET_BLURB[museumId] ?? pathSheetBlurb(museumId);
}

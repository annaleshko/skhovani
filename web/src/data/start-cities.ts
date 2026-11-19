import { getCity, type City } from "./cities";

/** City picker order. */
export const START_CITY_IDS = [
  "kyiv",
  "vinnytsia",
  "dnipro",
  "donetsk",
  "zhytomyr",
  "zaporizhzhia",
  "ivano-frankivsk",
  "kropyvnytskyi",
  "luhansk",
  "lutsk",
  "lviv",
  "melitopol",
  "mykolaiv",
  "odesa",
  "poltava",
  "rivne",
  "simferopol",
  "sumy",
  "ternopil",
  "uzhhorod",
  "kharkiv",
  "kherson",
  "khmelnytskyi",
  "cherkasy",
  "chernivtsi",
  "chernihiv",
  "abroad",
] as const;

export type StartCityId = (typeof START_CITY_IDS)[number];

export const ABROAD_CITY_ID = "abroad" as const;

/** Synthetic origin for «Я за кордоном» — lng is replaced per target museum. */
export const ABROAD_CITY: City = {
  id: ABROAD_CITY_ID,
  name: "Ти",
  oblast: "",
  // Placeholder; JourneyFlow overrides lng to sit west of the map at the target lat.
  lat: 48.5,
  lng: 21.0,
};

export function isAbroadCityId(id: string | null | undefined): boolean {
  return id === ABROAD_CITY_ID;
}

export function getStartCityOption(id: string): City | undefined {
  if (isAbroadCityId(id)) return ABROAD_CITY;
  return getCity(id);
}

export function startCityLabel(id: string): string {
  if (isAbroadCityId(id)) return "Я за кордоном";
  return getCity(id)?.name ?? id;
}

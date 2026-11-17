import type { City } from "./cities";
import { getCity } from "./cities";

export type Rhythm = "daily" | "thrice" | "none";

export type DemoUser = {
  name: string;
  nameVocative: string;
  startCityId: string;
  account: "Google" | "email";
  rhythm: Rhythm;
  avatarInitial: string;
};

/** Fake signed-in jury/demo user (MVP: no auth). */
export const demoUser: DemoUser = {
  name: "Анна",
  nameVocative: "Анно",
  startCityId: "vinnytsia",
  account: "Google",
  rhythm: "none", // Без нагадувань — next path available immediately
  avatarInitial: "А",
};

export function getDemoStartCity(): City {
  const city = getCity(demoUser.startCityId);
  if (!city) {
    // Fallback should never hit — vinnytsia is in cities.ts
    return {
      id: "vinnytsia",
      name: "Вінниця",
      oblast: "Вінницька",
      lat: 49.2331,
      lng: 28.4682,
    };
  }
  return city;
}

"use client";

import { CityPicker } from "@/components/journey/CityPicker";
import { JourneyFlow } from "@/components/journey/JourneyFlow";
import { useAppState } from "@/state/AppState";

/** Entry: city picker when startCityId is empty, else the journey map. */
export default function HomePage() {
  const { ready, startCityId } = useAppState();

  if (!ready) {
    return <div className="min-h-dvh bg-screen" aria-busy />;
  }

  if (!startCityId) {
    return <CityPicker />;
  }

  return <JourneyFlow />;
}

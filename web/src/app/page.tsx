"use client";

import { CityPicker } from "@/components/journey/CityPicker";
import { JourneyFlow } from "@/components/journey/JourneyFlow";
// MVP v2: disabled — Home / Collection / Profile tabs
// import { HomePlaceholder } from "@/components/home/HomePlaceholder";
import { useAppState } from "@/state/AppState";

/**
 * MVP v2 entry: city picker (01) when startCityId is empty, else map journey (02…).
 */
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

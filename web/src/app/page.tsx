"use client";

import { HomePlaceholder } from "@/components/home/HomePlaceholder";
import { JourneyFlow } from "@/components/journey/JourneyFlow";
import { useAppState } from "@/state/AppState";

/**
 * First visit (no completed paths) → journey E1→07…
 * Returning visit → Home placeholder with next path + «Летимо».
 */
export default function HomePage() {
  const { ready, completedPaths } = useAppState();

  if (!ready) {
    return <div className="min-h-dvh bg-screen" aria-busy />;
  }

  if (completedPaths.length === 0) {
    return <JourneyFlow />;
  }

  return <HomePlaceholder />;
}

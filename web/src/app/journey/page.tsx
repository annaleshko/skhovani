"use client";

import { CityPicker } from "@/components/journey/CityPicker";
import { JourneyFlow } from "@/components/journey/JourneyFlow";
import { JourneyRouteMap } from "@/components/journey/JourneyRouteMap";
import { useAppState } from "@/state/AppState";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function JourneyInner() {
  const { ready, startCityId } = useAppState();
  const params = useSearchParams();
  const mode = params.get("mode");
  const raw = params.get("path");
  const pathN = raw ? Number(raw) : undefined;
  const autostart = params.get("autostart") === "1";
  const revisit = params.get("revisit") === "1";
  const reopen = params.get("reopen") === "1";
  const explore = params.get("explore") === "1";

  if (!ready) return <div className="h-full bg-screen" aria-busy />;

  if (!startCityId) {
    return <CityPicker />;
  }

  if (mode === "route") {
    return <JourneyRouteMap />;
  }

  return (
    <JourneyFlow
      pathN={Number.isFinite(pathN) ? pathN : undefined}
      autostart={autostart}
      revisit={revisit}
      reopenHall={reopen}
      exploreHall={explore}
    />
  );
}

export default function JourneyPage() {
  return (
    <Suspense fallback={<div className="h-full bg-screen" aria-busy />}>
      <JourneyInner />
    </Suspense>
  );
}

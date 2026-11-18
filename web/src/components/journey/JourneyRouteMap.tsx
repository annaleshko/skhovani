"use client";

import { RouteMapScreen } from "@/components/journey/RouteMapScreen";
import {
  getNextPath,
  isJourneyComplete,
  shouldSkipMapToHall,
  type ResolvedPath,
} from "@/data/journey";
import { useAppState } from "@/state/AppState";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Standalone 02в — `/journey?mode=route` (also used from /finish).
 * «Вирушити» flies via `/journey?path=N&autostart=1` (no second confirm sheet).
 */
export function JourneyRouteMap() {
  const router = useRouter();
  const { completedPaths } = useAppState();
  const next = getNextPath(completedPaths) ?? null;

  const onDepart = useCallback(
    (path: ResolvedPath) => {
      if (shouldSkipMapToHall(completedPaths, path)) {
        router.replace(
          `/hall/${path.museumId}?path=${path.n}&artwork=${path.artworkId}`,
        );
        return;
      }
      router.replace(`/journey?path=${path.n}&autostart=1`);
    },
    [completedPaths, router],
  );

  if (isJourneyComplete(completedPaths) || !next) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-screen px-xl text-body-md text-text-secondary">
        Усі шляхи пройдено
      </div>
    );
  }

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-screen">
      <RouteMapScreen open next={next} onDepart={onDepart} />
    </div>
  );
}

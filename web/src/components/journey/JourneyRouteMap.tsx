"use client";

import { RouteMapScreen } from "@/components/journey/RouteMapScreen";
import {
  getNextPath,
  shouldSkipMapToHall,
  type ResolvedPath,
} from "@/data/journey";
import { useAppState } from "@/state/AppState";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Standalone 02в — `/journey?mode=route` (also used from /finish).
 * «Вирушити» flies via `/journey?path=N&autostart=1` (no second confirm sheet).
 * Star revisit: `/journey?path=N&autostart=1&revisit=1` (+ `&reopen=1` when all done).
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

  const onRevisit = useCallback(
    (path: ResolvedPath, opts: { reopen: boolean }) => {
      const reopen = opts.reopen ? "&reopen=1" : "";
      router.replace(
        `/journey?path=${path.n}&autostart=1&revisit=1${reopen}`,
      );
    },
    [router],
  );

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-screen">
      <RouteMapScreen
        open
        next={next}
        onDepart={onDepart}
        onRevisit={onRevisit}
      />
    </div>
  );
}

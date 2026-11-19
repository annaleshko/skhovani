"use client";

import { JourneyFlow } from "@/components/journey/JourneyFlow";
import { RouteMapScreen } from "@/components/journey/RouteMapScreen";
import { getNextPath, type ResolvedPath } from "@/data/journey";
import { useAppState } from "@/state/AppState";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

/**
 * Standalone 02в — `/journey?mode=route` (also used from /finish).
 * «Вирушити» overlays JourneyFlow which flies cam07 → cam09 (same 07 framing
 * as this screen, so there is no camera jump at the tap).
 */
export function JourneyRouteMap() {
  const router = useRouter();
  const { completedPaths } = useAppState();
  const next = getNextPath(completedPaths) ?? null;
  const [routeFlight, setRouteFlight] = useState<number | null>(null);

  const onDepart = useCallback((path: ResolvedPath) => {
    setRouteFlight(path.n);
  }, []);

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
      {routeFlight != null ? (
        <div className="absolute inset-0 z-[60]">
          <JourneyFlow pathN={routeFlight} autostart fromRouteMap />
        </div>
      ) : null}
    </div>
  );
}

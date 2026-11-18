"use client";

import { useAppState } from "@/state/AppState";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * MVP v2: disabled — final screen with counters.
 * Redirects into the journey / route-map flow.
 */
export default function FinishPage() {
  const router = useRouter();
  const { ready, startCityId } = useAppState();

  useEffect(() => {
    if (!ready) return;
    router.replace(startCityId ? "/journey?mode=route" : "/");
  }, [ready, router, startCityId]);

  return <div className="min-h-dvh bg-screen" aria-busy />;
}

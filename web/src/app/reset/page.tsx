"use client";

import { useAppState } from "@/state/AppState";
import { resetHomeHref } from "@/state/storage";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Jury demo reset — clears progress and returns to city picker. No visible UI. */
export default function ResetPage() {
  const router = useRouter();
  const { resetAll } = useAppState();

  useEffect(() => {
    resetAll();
    router.replace(resetHomeHref());
  }, [resetAll, router]);

  return <div className="min-h-dvh bg-screen" aria-busy />;
}

"use client";

import { useAppState } from "@/state/AppState";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Jury demo reset — clears localStorage and returns to `/`. No visible UI. */
export default function ResetPage() {
  const router = useRouter();
  const { resetAll } = useAppState();

  useEffect(() => {
    resetAll();
    router.replace("/");
  }, [resetAll, router]);

  return <div className="min-h-dvh bg-screen" aria-busy />;
}

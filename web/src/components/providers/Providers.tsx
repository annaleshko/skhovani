"use client";

import { AppStateProvider } from "@/state/AppState";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}

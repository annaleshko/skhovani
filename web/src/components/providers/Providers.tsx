"use client";

import type { ReactNode } from "react";

/**
 * Root client wrappers. App state lives inside DesktopPreviewGate's app branch
 * so the desktop phone-shell window never persists localStorage.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

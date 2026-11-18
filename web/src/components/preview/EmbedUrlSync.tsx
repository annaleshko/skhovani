"use client";

import { useEffect } from "react";

const MSG = "shovani:embed-nav";

/** Path without `embed=1`, for the parent preview URL. */
function outerPathFromLocation(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("embed");
  const qs = url.searchParams.toString();
  return url.pathname + (qs ? `?${qs}` : "") + url.hash;
}

/**
 * Inside `?embed=1` iframe: notify the parent preview when the app navigates
 * so the outer URL stays in sync (reload keeps the current screen).
 */
export function EmbedUrlSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("embed") !== "1") {
      return;
    }
    if (window.parent === window) return;

    const notify = () => {
      window.parent.postMessage(
        { type: MSG, path: outerPathFromLocation() },
        window.location.origin,
      );
    };

    notify();

    const wrap =
      (fn: typeof history.pushState) =>
      function (this: History, ...args: Parameters<typeof history.pushState>) {
        const result = fn.apply(this, args);
        notify();
        return result;
      };

    const push = history.pushState.bind(history);
    const replace = history.replaceState.bind(history);
    history.pushState = wrap(push);
    history.replaceState = wrap(replace);
    window.addEventListener("popstate", notify);

    return () => {
      history.pushState = push;
      history.replaceState = replace;
      window.removeEventListener("popstate", notify);
    };
  }, []);

  return null;
}

export const EMBED_NAV_MESSAGE = MSG;

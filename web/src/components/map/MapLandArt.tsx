"use client";

import { MAP_LAND_INNER } from "./map-land-inner";

type Props = {
  /** Drop-shadow under the land mass. Disable during flight/zoom for perf. */
  shadow?: boolean;
};

const SHADOW_FILTER = 'filter="url(#filter0_d_61_46)"';

/** Inline Ukraine map art (viewBox 408×296). Stays vector at any camera scale. */
export function MapLandArt({ shadow = true }: Props) {
  const html = shadow
    ? MAP_LAND_INNER
    : MAP_LAND_INNER.replace(SHADOW_FILTER, "");
  return <g aria-hidden dangerouslySetInnerHTML={{ __html: html }} />;
}

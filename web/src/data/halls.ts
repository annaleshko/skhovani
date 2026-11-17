import { assetMap } from "./asset-map";

export type HallAssets = {
  panorama: string;
  /** Fallback single hall photo */
  hall: string;
  frame: string;
  spotlight: string;
  lightCone: string;
  projector: string;
};

export function getHallAssets(museumId: string): HallAssets {
  const m = assetMap.museums[museumId as keyof typeof assetMap.museums];
  return {
    panorama: `/halls/${museumId}/panorama.png`,
    hall: m?.hall ?? `/halls/${museumId}.webp`,
    frame: assetMap.hallUi.frame,
    spotlight: assetMap.hallUi.spotlight,
    lightCone: assetMap.hallUi.lightCone,
    projector: assetMap.hallUi.projector,
  };
}

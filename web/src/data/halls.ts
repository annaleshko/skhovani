import { assetMap } from "./asset-map";

export type HallAssets = {
  hall: string;
  marker: string;
  lamp: string;
  cone: string;
  tourCone: string;
  tourFrame: (artworkId: number) => string;
};

export function getHallAssets(museumId: string): HallAssets {
  const m = assetMap.museums[museumId as keyof typeof assetMap.museums];
  return {
    hall: m?.hall ?? `/halls/${museumId}/hall.webp`,
    marker: assetMap.hallUi.marker,
    lamp: assetMap.hallUi.lamp,
    cone: assetMap.hallUi.cone,
    tourCone: assetMap.hallUi.tourCone,
    tourFrame: (artworkId: number) =>
      museumId === "kherson"
        ? `/halls/kherson/frames/${artworkId}.webp`
        : (m?.hall ?? `/halls/${museumId}/hall.webp`),
  };
}

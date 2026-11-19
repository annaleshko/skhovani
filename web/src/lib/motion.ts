"use client";

import { useReducedMotion } from "framer-motion";

/** Named durations (ms) and easings. */
export const motionTokens = {
  staggerReveal: { duration: 0.4, step: 0.12, y: 8 },
  cardStagger: { step: 0.08 },
  suggestionsFade: 0.15,
  forward: { duration: 0.3, previousShift: "30%" },
  pinPulse: { duration: 1.6 },
  mapFadeIn: 0.6,
  arcDraw: 1.2,
  /** Dotted start→target route draw-in. */
  dottedDraw: 0.8,
  sheetSlide: 0.3,
  sheetHide: 0.25,
  flight: 1.6,
  zoomCity: 0.8,
  facadeCrossfade: 0.35,
  facadeScale: 1.02,
  doorEnter: 0.6,
  spotlight: { duration: 0.3, step: 0.12 },
  frameShake: 0.3,
  /** Stolen empty frame → memory painting reveal. */
  memoryReveal: 2.5,
  /** Pause after reveal before the tour opens. */
  memoryHold: 1.2,
  /** Same-museum scroll to the next frame. */
  hallScroll: 0.6,
  neighborCaption: 2.5,
  artworkExpand: 0.5,
  /** Camera glide between tour stops. */
  lens: 0.7,
  /** Pointer ring fade+scale after camera arrives. */
  lensAppear: 0.35,
  /** Cone opacity fade during zoom. */
  tourLamp: 0.3,
  stopCrossfade: 0.25,
  pauseMorph: 0.2,
  /** Tour → passport (16): zoom out to full frame. */
  tourExitZoom: 0.6,
  sheetSpring: 0.35,
  scrim: 0.2,
  tabUnderline: 0.2,
  tabContent: 0.15,
  wallpaperCrossfade: 0.25,
  starZoomOut: 0.8,
  starBurst: 0.6,
  counter: { duration: 0.4, step: 0.1 },
  codeShake: 0.3,
  optionSelect: 0.15,
  tabBar: 0.25,
  pushPop: 0.3,
  filterLayout: 0.25,
  skeleton: { loop: 1.2, fadeIn: 0.4 },
  reducedCrossfade: 0.2,
} as const;

export const easings = {
  easeOut: [0.16, 1, 0.3, 1] as const,
  easeInOut: [0.45, 0, 0.55, 1] as const,
  easeIn: [0.55, 0, 1, 0.45] as const,
  linear: "linear" as const,
};

export const defaultSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

/** Prefer this over raw useReducedMotion so reduced mode uses 200ms crossfades. */
export function useReducedMotionSafe() {
  const reduced = useReducedMotion();
  return Boolean(reduced);
}

export function reducedOr(
  reduced: boolean,
  full: { duration: number; ease?: (typeof easings)[keyof typeof easings] | string },
) {
  if (reduced) {
    return { duration: motionTokens.reducedCrossfade, ease: easings.easeOut };
  }
  return full;
}

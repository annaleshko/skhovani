#!/usr/bin/env node
/**
 * Unit check: camera07 / camera09 — land 336px on 07; Kherson at (208,356) on 9.
 * Mirrors web/src/lib/camera.ts — keep in sync.
 */

const MAP_LAND = { x: 36, y: 14, w: 336, h: 224 };
const MAP_07 = { x: 27, y: 253, w: 336, h: 224 };
const MAP_07_ORIGIN = { x: MAP_07.x - MAP_LAND.x, y: MAP_07.y - MAP_LAND.y };
const MAP_07_SCALE = 1;
const ZOOM_SCALE = 6.22;
const ZOOM_FOCUS = { x: 208, y: 356 };

function cameraPlaceAt(pt, scale, screenX, screenY) {
  return {
    tx: screenX - pt.x * scale,
    ty: screenY - pt.y * scale,
    scale,
  };
}

function cameraProjectPoint(pt, cam) {
  return {
    x: cam.tx + pt.x * cam.scale,
    y: cam.ty + pt.y * cam.scale,
  };
}

function camera07() {
  return { tx: MAP_07_ORIGIN.x, ty: MAP_07_ORIGIN.y, scale: MAP_07_SCALE };
}

function camera09(pt) {
  return cameraPlaceAt(pt, MAP_07_SCALE * ZOOM_SCALE, ZOOM_FOCUS.x, ZOOM_FOCUS.y);
}

const pt = { x: 231.0, y: 180.2 }; // Kherson
let failed = false;

{
  const cam = camera07();
  const landW = MAP_LAND.w * cam.scale;
  const landOk = Math.abs(landW - 336) <= 2;
  const originOk = cam.tx === -9 && cam.ty === 239 && cam.scale === 1;
  const screen = cameraProjectPoint(pt, cam);
  const inLand =
    screen.x >= MAP_07.x &&
    screen.x <= MAP_07.x + MAP_07.w &&
    screen.y >= MAP_07.y &&
    screen.y <= MAP_07.y + MAP_07.h;
  console.log(
    `${originOk && landOk ? "OK" : "FAIL"} cam07: origin=(${cam.tx}, ${cam.ty}) scale=${cam.scale} ` +
      `landW=${landW.toFixed(1)} Kherson=(${screen.x.toFixed(1)}, ${screen.y.toFixed(1)})`,
  );
  if (!originOk || !landOk || !inLand) failed = true;
}

{
  const cam = camera09(pt);
  const screen = cameraProjectPoint(pt, cam);
  const dx = Math.abs(screen.x - ZOOM_FOCUS.x);
  const dy = Math.abs(screen.y - ZOOM_FOCUS.y);
  const ok = dx <= 1 && dy <= 1 && Math.abs(cam.scale - ZOOM_SCALE) < 0.01;
  console.log(
    `${ok ? "OK" : "FAIL"} cam09@6.22: screen=(${screen.x.toFixed(2)}, ${screen.y.toFixed(2)}) ` +
      `expect=(${ZOOM_FOCUS.x}, ${ZOOM_FOCUS.y}) scale=${cam.scale.toFixed(4)}`,
  );
  if (!ok) failed = true;
}

if (failed) {
  console.error("camera test FAILED");
  process.exit(1);
}
console.log("camera test OK");

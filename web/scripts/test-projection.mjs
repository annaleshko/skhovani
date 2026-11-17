#!/usr/bin/env node
/**
 * Unit check: projectToMap geographic fit (±1px).
 * Mirrors web/src/lib/geo.ts — keep in sync.
 */
const MAP_X_A = 18.5616;
const MAP_X_B = -374.453;
const MAP_Y_A = -28.8635;
const MAP_Y_B = 1526.24;

const CITIES = [
  { name: "vinnytsia", lat: 49.2331, lng: 28.4682, x: 154.0, y: 105.2 },
  { name: "kherson", lat: 46.6354, lng: 32.6169, x: 231.0, y: 180.2 },
  { name: "lviv", lat: 49.8397, lng: 24.0297, x: 71.6, y: 87.7 },
  { name: "kharkiv", lat: 49.9935, lng: 36.2304, x: 298.0, y: 83.3 },
];

function projectToMap(lat, lng) {
  return {
    x: MAP_X_A * lng + MAP_X_B,
    y: MAP_Y_A * lat + MAP_Y_B,
  };
}

const TOL = 1;
let failed = false;

for (const a of CITIES) {
  const p = projectToMap(a.lat, a.lng);
  const dx = Math.abs(p.x - a.x);
  const dy = Math.abs(p.y - a.y);
  const ok = dx <= TOL && dy <= TOL;
  console.log(
    `${ok ? "OK" : "FAIL"} ${a.name}: got (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) ` +
      `expect (${a.x}, ${a.y}) Δ=(${dx.toFixed(2)}, ${dy.toFixed(2)})`,
  );
  if (!ok) failed = true;
}

if (failed) {
  console.error("projection test FAILED");
  process.exit(1);
}
console.log("projection test OK");

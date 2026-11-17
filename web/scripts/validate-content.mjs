#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentPath = path.join(__dirname, "../src/data/content.json");
const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));

const errors = [];

function fail(msg) {
  errors.push(msg);
}

const artworkById = new Map(content.artworks.map((a) => [a.id, a]));
const museumById = new Map(content.museums.map((m) => [m.id, m]));

for (const a of content.artworks) {
  if (!Array.isArray(a.tourStops) || a.tourStops.length !== 4) {
    fail(`artwork ${a.id} (${a.slug}): expected 4 tourStops, got ${a.tourStops?.length}`);
  }
  if (!a.touchZones?.zones?.length) {
    fail(`artwork ${a.id}: missing touchZones.zones`);
  }
  const withUrl = (a.sources ?? []).filter((s) => s.url);
  if (withUrl.length < 3) {
    fail(`artwork ${a.id}: need ≥3 sources with URLs, got ${withUrl.length}`);
  }
  const sourceIds = new Set((a.sources ?? []).map((s) => s.id));
  for (const kb of a.chat?.knowledgeBase ?? []) {
    if (kb.sourceId != null && !sourceIds.has(kb.sourceId)) {
      fail(`artwork ${a.id}: knowledgeBase sourceId "${kb.sourceId}" missing`);
    }
  }
}

for (const m of content.museums) {
  for (const id of m.artworkIds ?? []) {
    if (!artworkById.has(id)) fail(`museum ${m.id}: artworkId ${id} missing`);
  }
}

for (const p of content.journey?.paths ?? []) {
  if (!museumById.has(p.museumId)) fail(`path ${p.n}: museum ${p.museumId} missing`);
  if (!artworkById.has(p.artworkId)) fail(`path ${p.n}: artwork ${p.artworkId} missing`);
}

if (errors.length) {
  console.error("content validation FAILED:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

console.log(
  `content OK: ${content.artworks.length} artworks, ${content.museums.length} museums, ${content.journey.paths.length} paths`,
);

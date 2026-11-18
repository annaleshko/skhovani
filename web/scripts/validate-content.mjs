#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(WEB_ROOT, "..");
const contentPath = path.join(WEB_ROOT, "src/data/content.json");
const artworksPath = path.join(REPO_ROOT, "data/artworks.json");

const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const source = JSON.parse(fs.readFileSync(artworksPath, "utf8"));

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
  for (const ek of a.extendedKnowledge ?? []) {
    if (!ek.fact || !ek.sourceId) {
      fail(`artwork ${a.id}: extendedKnowledge entry missing fact/sourceId`);
    } else if (!sourceIds.has(ek.sourceId)) {
      fail(`artwork ${a.id}: extendedKnowledge sourceId "${ek.sourceId}" missing`);
    }
  }
}

for (const m of content.museums) {
  for (const id of m.artworkIds ?? []) {
    if (!artworkById.has(id)) fail(`museum ${m.id}: artworkId ${id} missing`);
  }
}

const contentPaths = content.journey?.paths ?? [];
const sourcePaths = source.journey?.paths ?? [];

if (contentPaths.length !== sourcePaths.length) {
  fail(
    `journey.paths length mismatch: content.json=${contentPaths.length} artworks.json=${sourcePaths.length}`,
  );
}

for (let i = 0; i < Math.max(contentPaths.length, sourcePaths.length); i++) {
  const c = contentPaths[i];
  const s = sourcePaths[i];
  if (!c || !s) continue;
  if (c.n !== s.n || c.museumId !== s.museumId || c.artworkId !== s.artworkId) {
    fail(
      `path[${i}] out of sync with artworks.json: content=${JSON.stringify(c)} source=${JSON.stringify(s)}`,
    );
  }
}

if (contentPaths.length !== 10) {
  fail(`MVP v2 expects 10 journey paths, got ${contentPaths.length}`);
}

for (const p of contentPaths) {
  if (!museumById.has(p.museumId)) fail(`path ${p.n}: museum ${p.museumId} missing`);
  if (!artworkById.has(p.artworkId)) fail(`path ${p.n}: artwork ${p.artworkId} missing`);
}

if (errors.length) {
  console.error("content validation FAILED:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

console.log(
  `content OK: ${content.artworks.length} artworks, ${content.museums.length} museums, ${contentPaths.length} paths (synced with data/artworks.json)`,
);

#!/usr/bin/env node
/**
 * Imports extended guide facts from docs/guide-knowledge-extra.md
 * into data/artworks.json + web/src/data/content.json, then validates.
 *
 * Markdown shape:
 *   ## <id> · <title>
 *   ## Спільне … (id 1, 2, 4, 5, 6, 7)
 *   ## Спільне для всіх творів · …  → all artworks, scope "context" under # Ширший контекст
 *   - <fact> ⚠ verify [src: <label> | <url>]
 *
 * Section `# Ширший контекст` marks following ## blocks as scope: "context".
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(WEB_ROOT, "..");
const EXTRA = path.join(REPO_ROOT, "docs/guide-knowledge-extra.md");
const ARTWORKS = path.join(REPO_ROOT, "data/artworks.json");
const CONTENT = path.join(WEB_ROOT, "src/data/content.json");

if (!fs.existsSync(EXTRA)) {
  console.log("docs/guide-knowledge-extra.md not found — skip import");
  process.exit(0);
}

const md = fs.readFileSync(EXTRA, "utf8");
const artworksFile = JSON.parse(fs.readFileSync(ARTWORKS, "utf8"));
const ALL_ARTWORK_IDS = artworksFile.artworks.map((a) => a.id);

/** Stable short id from label+url so the same source reuses one id. */
function sourceIdFor(label, url) {
  const h = crypto
    .createHash("sha1")
    .update(`${label}|${url ?? ""}`)
    .digest("hex")
    .slice(0, 8);
  return `xk_${h}`;
}

/**
 * Parse one bullet:
 * `- fact text ⚠ verify [src: Label | https://…]`
 */
function parseBullet(line) {
  const m = line.match(
    /^-\s+(.+?)\s*\[src:\s*(.+?)\s*\|\s*(https?:\/\/\S+|null)\s*\]\s*$/u,
  );
  if (!m) return null;
  let fact = m[1].trim();
  const label = m[2].trim();
  const urlRaw = m[3].trim();
  const url = urlRaw === "null" ? null : urlRaw;
  const verify = /⚠\s*verify/i.test(fact);
  fact = fact
    .replace(/\s*⚠\s*verify(?:\s*\([^)]*\))?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return { fact, label, url, verify };
}

/**
 * Split markdown into ## sections; track H1 for scope (context vs extra).
 * @returns {{ title: string, bullets: string[], scope: "extra" | "context" }[]}
 */
function parseSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;
  let scope = "extra";
  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)\s*$/);
    if (h1 && !line.startsWith("##")) {
      scope = /ширший\s+контекст/i.test(h1[1]) ? "context" : "extra";
      continue;
    }
    const head = line.match(/^##\s+(.+)\s*$/);
    if (head) {
      current = { title: head[1].trim(), bullets: [], scope };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    if (/^-\s+/.test(line)) current.bullets.push(line.trim());
  }
  return sections;
}

/** Resolve which artwork ids a section applies to. */
function sectionArtworkIds(title) {
  if (/Спільне для всіх творів/i.test(title)) {
    return [...ALL_ARTWORK_IDS];
  }
  const shared = title.match(/\(id\s*([\d,\s]+)\)/i);
  if (shared) {
    return shared[1]
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
  }
  const single = title.match(/^(\d+)\s*·/);
  if (single) return [Number(single[1])];
  return [];
}

const sections = parseSections(md);
/** @type {Map<number, { sources: Map<string, object>, facts: object[] }>} */
const byArt = new Map();

function ensureArt(id) {
  if (!byArt.has(id)) {
    byArt.set(id, { sources: new Map(), facts: [] });
  }
  return byArt.get(id);
}

let bulletCount = 0;
let contextCount = 0;
for (const sec of sections) {
  const ids = sectionArtworkIds(sec.title);
  if (!ids.length) {
    console.warn(`skip section (no artwork ids): ${sec.title}`);
    continue;
  }
  for (const line of sec.bullets) {
    const parsed = parseBullet(line);
    if (!parsed) {
      console.warn(`skip bullet: ${line.slice(0, 80)}…`);
      continue;
    }
    bulletCount += 1;
    if (sec.scope === "context") contextCount += 1;
    const sid = sourceIdFor(parsed.label, parsed.url);
    for (const id of ids) {
      const bucket = ensureArt(id);
      bucket.sources.set(sid, {
        id: sid,
        label: parsed.label,
        url: parsed.url,
        note: parsed.verify ? "⚠ verify" : null,
      });
      bucket.facts.push({
        fact: parsed.fact,
        sourceId: sid,
        verify: parsed.verify,
        sourceLabel: parsed.label,
        scope: sec.scope,
      });
    }
  }
}

function apply(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [id, bucket] of byArt) {
    const art = data.artworks.find((a) => a.id === id);
    if (!art) {
      console.warn(`artwork not found: ${id}`);
      continue;
    }
    const byId = new Map(art.sources.map((s) => [s.id, s]));
    for (const s of bucket.sources.values()) {
      byId.set(s.id, s);
    }
    art.sources = [...byId.values()];
    // Replace extendedKnowledge from this import (idempotent).
    art.extendedKnowledge = bucket.facts.map((f) => {
      const entry = {
        fact: f.fact,
        sourceId: f.sourceId,
        sourceLabel: f.sourceLabel,
      };
      if (f.verify) entry.verify = true;
      if (f.scope === "context") entry.scope = "context";
      return entry;
    });
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

apply(ARTWORKS);
apply(CONTENT);
console.log(
  `imported ${bulletCount} bullets (${contextCount} context) → ${byArt.size} artworks with extendedKnowledge`,
);

const v = spawnSync(
  process.execPath,
  [path.join(__dirname, "validate-content.mjs")],
  { cwd: WEB_ROOT, stdio: "inherit" },
);
process.exit(v.status ?? 1);

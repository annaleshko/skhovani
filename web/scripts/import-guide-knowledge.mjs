#!/usr/bin/env node
/**
 * Imports optional extended guide facts from docs/guide-knowledge-extra.md
 * into data/artworks.json + web/src/data/content.json, then validates.
 *
 * Expected markdown shape (JSON fenced block):
 *
 * ```json
 * {
 *   "artworks": [
 *     {
 *       "id": 1,
 *       "sources": [{ "id": "sx1", "label": "...", "url": null, "note": null }],
 *       "extendedKnowledge": [{ "fact": "...", "sourceId": "sx1" }]
 *     }
 *   ]
 * }
 * ```
 *
 * No-op (exit 0) if the file is missing — facts are supplied later by the team.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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
const match = md.match(/```json\s*([\s\S]*?)```/);
if (!match) {
  console.error("No ```json block found in guide-knowledge-extra.md");
  process.exit(1);
}

const payload = JSON.parse(match[1]);
const rows = Array.isArray(payload.artworks) ? payload.artworks : [];

function apply(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const row of rows) {
    const art = data.artworks.find((a) => a.id === row.id || a.slug === row.slug);
    if (!art) {
      console.warn(`artwork not found: ${row.id ?? row.slug}`);
      continue;
    }
    if (Array.isArray(row.sources) && row.sources.length) {
      const byId = new Map(art.sources.map((s) => [s.id, s]));
      for (const s of row.sources) {
        byId.set(s.id, {
          id: s.id,
          label: s.label,
          url: s.url ?? null,
          note: s.note ?? null,
        });
      }
      art.sources = [...byId.values()];
    }
    if (Array.isArray(row.extendedKnowledge)) {
      art.extendedKnowledge = row.extendedKnowledge.map((e) => ({
        fact: String(e.fact),
        sourceId: String(e.sourceId),
      }));
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

apply(ARTWORKS);
apply(CONTENT);
console.log(`imported extendedKnowledge for ${rows.length} artwork row(s)`);

const v = spawnSync(process.execPath, [path.join(__dirname, "validate-content.mjs")], {
  cwd: WEB_ROOT,
  stdio: "inherit",
});
process.exit(v.status ?? 1);

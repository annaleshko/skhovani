#!/usr/bin/env node
/**
 * Copies root asset folders into web/public with Latin kebab-case names.
 * Run from web/: node scripts/prepare-assets.mjs
 *
 * Hall frames: ALWAYS from art/*.png (alpha). Never flatten via jpg.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(WEB_ROOT, "..");
const PUBLIC = path.join(WEB_ROOT, "public");

const content = JSON.parse(
  fs.readFileSync(path.join(WEB_ROOT, "src/data/content.json"), "utf8"),
);

const renameTable = [];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function track(original, next) {
  renameTable.push({ original, next });
  console.log(`${original}  →  ${next}`);
}

/** Prefer transparent PNG sibling when source path points at a jpg. */
function resolveRasterSrc(srcRel) {
  const abs = path.join(REPO_ROOT, srcRel);
  if (fs.existsSync(abs) && /\.png$/i.test(srcRel)) return abs;
  const pngRel = srcRel.replace(/\.jpe?g$/i, ".png");
  const pngAbs = path.join(REPO_ROOT, pngRel);
  if (fs.existsSync(pngAbs)) return pngAbs;
  if (fs.existsSync(abs)) return abs;
  return null;
}

/** Find a file under a directory by NFC-normalized basename match. */
function findByBasename(dir, basename) {
  if (!fs.existsSync(dir)) return null;
  const want = basename.normalize("NFC");
  for (const name of fs.readdirSync(dir)) {
    if (name.normalize("NFC") === want) return path.join(dir, name);
  }
  return null;
}

async function resizePipeline(src, maxSide) {
  const image = sharp(src);
  const meta = await image.metadata();
  const w = meta.width ?? maxSide;
  const h = meta.height ?? maxSide;
  const long = Math.max(w, h);
  if (long <= maxSide) return image;
  return image.resize({
    width: w >= h ? maxSide : undefined,
    height: h > w ? maxSide : undefined,
    fit: "inside",
    withoutEnlargement: true,
  });
}

async function toWebp(src, dest, maxSide, { keepAlpha = true } = {}) {
  ensureDir(path.dirname(dest));
  const pipeline = await resizePipeline(src, maxSide);
  await pipeline
    .webp({
      quality: 82,
      alphaQuality: keepAlpha ? 100 : 80,
      // Preserve alpha channel when present (hall frames / walls).
      force: true,
    })
    .toFile(dest);
}

/** PNG with alpha — used for neighbor «hidden art» frames. */
async function toPng(src, dest, maxSide) {
  ensureDir(path.dirname(dest));
  const pipeline = await resizePipeline(src, maxSide);
  await pipeline.png({ compressionLevel: 9, effort: 10 }).toFile(dest);
}

async function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

// --- Art (prefer PNG with alpha; fall back to jpg) ---
for (const artwork of content.artworks) {
  const srcRel = artwork.sourceAssets?.image;
  if (!srcRel) continue;
  const src = resolveRasterSrc(srcRel);
  if (!src) {
    console.warn(`MISSING art: ${srcRel}`);
    continue;
  }
  const destRel = `art/${artwork.slug}.webp`;
  await toWebp(src, path.join(PUBLIC, destRel), 2000);
  track(path.relative(REPO_ROOT, src), `/` + destRel);

  const alt = artwork.sourceAssets?.imageAlt;
  if (alt) {
    const altSrc = resolveRasterSrc(alt);
    if (altSrc) {
      const altDestRel = `art/${artwork.slug}-open.webp`;
      await toWebp(altSrc, path.join(PUBLIC, altDestRel), 2000);
      track(path.relative(REPO_ROOT, altSrc), `/` + altDestRel);
    }
  }
}

// --- Hall framed art from art/<name>.png (≥2× display, keep alpha) ---
const ART_DIR = path.join(REPO_ROOT, "art");
const HIDDEN_DIR = path.join(REPO_ROOT, "hidden art");
const HALL_FRAMES = path.join(PUBLIC, "hall/frames");
ensureDir(HALL_FRAMES);

/** Display-size max side → encode at ≥2× (cap 2000). */
const HALL_FRAME_MAX = 1200;

for (const artwork of content.artworks) {
  const srcRel = artwork.sourceAssets?.image;
  if (!srcRel || artwork.image == null) continue;
  const base = path.basename(srcRel).replace(/\.jpe?g$/i, ".png");
  const src = findByBasename(ART_DIR, base) ?? resolveRasterSrc(srcRel);
  if (!src || !/\.png$/i.test(src)) {
    console.warn(`MISSING hall frame PNG for #${artwork.id}: ${base}`);
    continue;
  }
  const destRel = `hall/frames/${artwork.id}.webp`;
  await toWebp(src, path.join(PUBLIC, destRel), HALL_FRAME_MAX);
  track(path.relative(REPO_ROOT, src), `/` + destRel);

  const hiddenSrc = findByBasename(HIDDEN_DIR, base);
  if (hiddenSrc) {
    const hiddenRel = `hall/frames/${artwork.id}-hidden.png`;
    await toPng(hiddenSrc, path.join(PUBLIC, hiddenRel), HALL_FRAME_MAX);
    track(path.relative(REPO_ROOT, hiddenSrc), `/` + hiddenRel);
  }
}

// --- Hall walls from backgrounds/ (keep alpha; ≥2× of design) ---
const HALL_WALLS = {
  kherson: "херсонський музей.png",
  melitopol: "мелітопольский музей.png",
  kharkiv: "Харківський художній музей.png",
  chernihiv: "Чернігівський художній музей імені Григорія Галагана.png",
  lviv: "національний музей во Львові.png",
};

const BG_DIR = path.join(REPO_ROOT, "backgrounds");
for (const [museumId, filename] of Object.entries(HALL_WALLS)) {
  const src = findByBasename(BG_DIR, filename);
  if (!src) {
    console.warn(`MISSING hall wall: backgrounds/${filename}`);
    continue;
  }
  const destRel = `halls/${museumId}/wall.webp`;
  // Kherson source is already 3318×1688 (2× of 1659×844). Others ~956×1788.
  await toWebp(src, path.join(PUBLIC, destRel), 3600);
  track(path.relative(REPO_ROOT, src), `/` + destRel);
}

// Darkness reference image (optional; runtime uses rgba(0,0,0,0.7))
{
  const src = findByBasename(BG_DIR, "blur backgrounds.png");
  if (src) {
    const destRel = "hall/darkness.webp";
    await toWebp(src, path.join(PUBLIC, destRel), 3600);
    track(path.relative(REPO_ROOT, src), `/` + destRel);
  }
}

// Lamp (transparent PNG)
{
  const src = findByBasename(ART_DIR, "lamp.png");
  if (src) {
    const destRel = "hall/lamp.png";
    await copyFile(src, path.join(PUBLIC, destRel));
    track(path.relative(REPO_ROOT, src), `/` + destRel);
  } else {
    console.warn("MISSING art/lamp.png");
  }
}

// --- Wallpapers (keep PNG) ---
for (const artwork of content.artworks) {
  const srcRel = artwork.sourceAssets?.wallpaper;
  if (!srcRel) continue;
  const src = path.join(REPO_ROOT, srcRel);
  if (!fs.existsSync(src)) {
    console.warn(`MISSING wallpaper: ${srcRel}`);
    continue;
  }
  const destRel = `wallpapers/${artwork.slug}.png`;
  await copyFile(src, path.join(PUBLIC, destRel));
  track(srcRel, `/` + destRel);
}

// --- Museums (full-screen facades 390×844 @2× → 780×1688 WebP) ---
const MUSEUM_SLUGS = {
  kherson: "kherson",
  melitopol: "melitopol",
  kharkiv: "kharkiv",
  lviv: "lviv",
  chernihiv: "chernihiv",
};

const FACADE_W = 780;
const FACADE_H = 1688;

async function toFacadeWebp(src, dest) {
  ensureDir(path.dirname(dest));
  await sharp(src)
    .resize(FACADE_W, FACADE_H, { fit: "cover", position: "top" })
    .webp({ quality: 86 })
    .toFile(dest);
}

for (const museum of content.museums) {
  const slug = MUSEUM_SLUGS[museum.id] ?? museum.id;
  const facadeRel = museum.sourceAssets?.facade;
  if (facadeRel) {
    const src = path.join(REPO_ROOT, facadeRel);
    if (fs.existsSync(src)) {
      const destRel = `museums/${slug}.webp`;
      await toFacadeWebp(src, path.join(PUBLIC, destRel));
      track(facadeRel, `/` + destRel);
    } else {
      console.warn(`MISSING facade: ${facadeRel}`);
    }
  }
}

// --- Map ---
{
  const src = path.join(REPO_ROOT, "map/Map.svg");
  const destRel = "map/map.svg";
  if (fs.existsSync(src)) {
    await copyFile(src, path.join(PUBLIC, destRel));
    track("map/Map.svg", `/` + destRel);
  }
}

// --- asset-map.ts ---
const assetMap = {
  artworks: Object.fromEntries(
    content.artworks.map((a) => [
      a.slug,
      {
        image: a.image,
        wallpaper: a.wallpaper,
        ...(a.sourceAssets?.imageAlt
          ? { imageAlt: `/art/${a.slug}-open.webp` }
          : {}),
      },
    ]),
  ),
  museums: Object.fromEntries(
    content.museums.map((m) => [
      m.id,
      {
        facade: `/museums/${m.id}.webp`,
        hall: `/halls/${m.id}/wall.webp`,
      },
    ]),
  ),
  hallUi: {
    marker: "/hall/marker.svg",
    lamp: "/hall/lamp.png",
    cone: "/hall/cone.svg",
    tourCone: "/hall/tour-cone.svg",
    darkness: "/hall/darkness.webp",
    trailCurrent: "/ui/trail-current.svg",
  },
};

const assetMapTs = `/* Auto-generated by scripts/prepare-assets.mjs — do not edit by hand */
export const assetMap = ${JSON.stringify(assetMap, null, 2)} as const;

export type ArtworkSlug = keyof typeof assetMap.artworks;
export type MuseumId = keyof typeof assetMap.museums;
`;

fs.writeFileSync(path.join(WEB_ROOT, "src/data/asset-map.ts"), assetMapTs);

console.log("\n=== Asset rename table ===");
console.table(renameTable);
console.log(
  `Wrote src/data/asset-map.ts (${Object.keys(assetMap.artworks).length} artworks, ${Object.keys(assetMap.museums).length} museums)`,
);

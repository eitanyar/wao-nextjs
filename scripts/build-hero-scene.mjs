// Builds the homepage hero scene: the AI-made workbench photo with a laptop whose screen is a pure-green
// rectangle, into web images plus a typed geometry module the hero window uses to sit on that screen.
// HEBREW-SAFETY: this script is ASCII-only and never contains Hebrew.
//
// Usage:
//   node scripts/build-hero-scene.mjs [master.png]     # default: data/home/hero-scene/workbench.png
//
// Steps (idempotent, re-run after replacing the master):
//   1. Find the green screen and fit its four edges (least squares), so the corners are sub-pixel exact.
//   2. Paint the screen and any green fringe around it near-black (a switched-off screen), so no green can
//      ever show: not around the live window, and not when the window is not drawn (old browsers).
//   3. Encode the scene as TILE_COUNT horizontal bands (8 px overlap) in AVIF + WebP at 4 widths.
//      Each band is smaller on screen than one line of the hero headline, so the photo can never be the LCP
//      element (LCP takes the largest single element; text blocks are measured one block at a time).
//      Every file carries an XMP packet with IPTC DigitalSourceType = trainedAlgorithmicMedia (AI-made).
//   4. Write src/data/heroScene.ts (scene size, screen corners, tile geometry, srcsets).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { XMP, DIGITAL_SOURCE_TYPE } from './build-knowledge-illustrations.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
export const DEFAULT_MASTER = path.join(root, 'data/home/hero-scene/workbench.png');
export const OUT_DIR = path.join(root, 'public/images/home');
export const DATA_OUTPUT = path.join(root, 'src/data/heroScene.ts');
export const NAME = 'hero-workbench';
export const WIDTHS = [640, 832, 1040];
/**
 * 16:9 crop around the laptop (Adam 2026-11-15: legibility). The screen spans ~71% of the visual's width; the workbench
 * (cup, hose, tools) stays at the edges. Never upscaled: the largest width equals the crop width.
 */
export const CROP = { width: 1040, height: 585, centreOnScreen: true, top: 70 };
const OVERLAP = 8; // master px shared by neighbouring bands
export const TILE_COUNT = 8;
const SCREEN_OFF = [11, 13, 16];
const BUDGET = 100_000; // bytes per file

const isGreen = (r, g, b) => g > 150 && r < 120 && b < 120;
const isGreenish = (r, g, b) => g > 90 && g > r * 1.35 && g > b * 1.35;

/** Least-squares line v = m*u + c. */
function fitLine(us, vs) {
  const n = us.length;
  const mu = us.reduce((a, b) => a + b, 0) / n;
  const mv = vs.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (us[i] - mu) * (vs[i] - mv);
    sxx += (us[i] - mu) ** 2;
  }
  const m = sxy / sxx;
  return { m, c: mv - m * mu };
}

/** Screen corners (TL, TR, BR, BL in image px) from the green mask. */
export function findScreen(data, width, height) {
  const green = (x, y) => {
    const i = (y * width + x) * 3;
    return isGreen(data[i], data[i + 1], data[i + 2]);
  };
  let x0 = width, x1 = -1, y0 = height, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (green(x, y)) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) throw new Error('no green screen found in the master');
  const bw = x1 - x0;
  const bh = y1 - y0;
  // Fit each edge on its central 70% only (the corners are rounded / anti-aliased).
  const xs = [], tops = [], bots = [];
  for (let x = Math.round(x0 + bw * 0.15); x <= x0 + bw * 0.85; x++) {
    let t = -1, b = -1;
    for (let y = y0; y <= y1; y++) if (green(x, y)) { if (t < 0) t = y; b = y; }
    if (t >= 0) { xs.push(x); tops.push(t); bots.push(b + 1); }
  }
  const ys = [], lefts = [], rights = [];
  for (let y = Math.round(y0 + bh * 0.15); y <= y0 + bh * 0.85; y++) {
    let l = -1, r = -1;
    for (let x = x0; x <= x1; x++) if (green(x, y)) { if (l < 0) l = x; r = x; }
    if (l >= 0) { ys.push(y); lefts.push(l); rights.push(r + 1); }
  }
  const top = fitLine(xs, tops), bottom = fitLine(xs, bots), left = fitLine(ys, lefts), right = fitLine(ys, rights);
  // Intersect y = m1*x + c1 with x = m2*y + c2.
  const meet = (h, v) => {
    const y = (h.m * v.c + h.c) / (1 - h.m * v.m);
    return [+(v.m * y + v.c).toFixed(2), +y.toFixed(2)];
  };
  return [meet(top, left), meet(top, right), meet(bottom, right), meet(bottom, left)];
}

function insidePolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Corners pushed `d` px away from the quad's centre (the paint margin / the window bleed). */
export function grow(quad, d) {
  const cx = quad.reduce((a, p) => a + p[0], 0) / 4;
  const cy = quad.reduce((a, p) => a + p[1], 0) / 4;
  return quad.map(([x, y]) => [x + Math.sign(x - cx) * d, y + Math.sign(y - cy) * d]);
}

/** Paint the screen (grown by 3 px) and any greenish fringe within 8 px of it near-black. Mutates `data`. */
export function switchOffScreen(data, width, height, quad) {
  const inner = grow(quad, 3);
  const outer = grow(quad, 8);
  const xs = outer.map((p) => p[0]);
  const ys = outer.map((p) => p[1]);
  let painted = 0;
  for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(height - 1, Math.ceil(Math.max(...ys))); y++) {
    for (let x = Math.max(0, Math.floor(Math.min(...xs))); x <= Math.min(width - 1, Math.ceil(Math.max(...xs))); x++) {
      const i = (y * width + x) * 3;
      const px = x + 0.5, py = y + 0.5;
      const hit = insidePolygon(px, py, inner) || (insidePolygon(px, py, outer) && isGreenish(data[i], data[i + 1], data[i + 2]));
      if (hit) { data[i] = SCREEN_OFF[0]; data[i + 1] = SCREEN_OFF[1]; data[i + 2] = SCREEN_OFF[2]; painted++; }
    }
  }
  let left = 0;
  for (let i = 0; i < data.length; i += 3) if (isGreen(data[i], data[i + 1], data[i + 2])) left++;
  if (left) throw new Error(`${left} pure-green px left after painting the screen`);
  return painted;
}

async function encode(raw, info, crop, width, ext, quality) {
  const height = Math.round((width * crop.height) / info.width);
  let img = sharp(raw, { raw: info }).extract(crop).resize(width, height, { fit: 'fill' }).withXmp(XMP);
  img = ext === 'avif' ? img.avif({ quality, effort: 6 }) : img.webp({ quality, effort: 6 });
  return { buf: await img.toBuffer(), height };
}

export async function build(master = DEFAULT_MASTER) {
  const { data, info } = await sharp(master).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const quad = findScreen(data, width, height);
  switchOffScreen(data, width, height, quad);
  // Crop around the screen centre, clamped to the master; the quad moves into crop coordinates.
  const cx = quad.reduce((a, p) => a + p[0], 0) / 4;
  const left = Math.max(0, Math.min(width - CROP.width, Math.round(cx - CROP.width / 2)));
  const top = Math.max(0, Math.min(height - CROP.height, CROP.top));
  const cropped = Buffer.alloc(CROP.width * CROP.height * 3);
  for (let y = 0; y < CROP.height; y++) data.copy(cropped, y * CROP.width * 3, ((top + y) * width + left) * 3, ((top + y) * width + left + CROP.width) * 3);
  const sceneQuad = quad.map(([x, y]) => [+(x - left).toFixed(2), +(y - top).toFixed(2)]);
  return encodeScene(cropped, CROP.width, CROP.height, sceneQuad);
}

async function encodeScene(data, width, height, quad) {
  const tiles = Array.from({ length: TILE_COUNT }, (_, i) => {
    const top = Math.max(0, Math.round((height * i) / TILE_COUNT) - OVERLAP / 2);
    const bottom = Math.min(height, Math.round((height * (i + 1)) / TILE_COUNT) + OVERLAP / 2);
    return { id: `b${i + 1}`, top, height: bottom - top };
  });
  // hero-owner.*: the retired AI owner photo (Fable 5.2, 2026-11-16: never in the window); removed if present.
  for (const f of fs.readdirSync(OUT_DIR)) if (f.startsWith(`${NAME}-`) || f.startsWith('hero-owner.')) fs.rmSync(path.join(OUT_DIR, f));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = [];
  const raw = { width, height, channels: 3 };
  for (const t of tiles) {
    t.files = {};
    for (const ext of ['avif', 'webp']) {
      t.files[ext] = [];
      for (const w of WIDTHS) {
        let quality = ext === 'avif' ? 55 : 78;
        let out = await encode(data, raw, { left: 0, top: t.top, width, height: t.height }, w, ext, quality);
        while (out.buf.length > BUDGET && quality > 30) {
          quality -= 5;
          out = await encode(data, raw, { left: 0, top: t.top, width, height: t.height }, w, ext, quality);
        }
        if (out.buf.length > BUDGET) throw new Error(`${t.id} ${w}.${ext} over budget: ${out.buf.length}`);
        if (!out.buf.includes(Buffer.from(DIGITAL_SOURCE_TYPE))) throw new Error(`${t.id} ${w}.${ext} lost XMP`);
        const name = `${NAME}-${t.id}-${w}.${ext}`;
        fs.writeFileSync(path.join(OUT_DIR, name), out.buf);
        t.files[ext].push({ src: `/images/home/${name}`, w, h: out.height });
        report.push(`${name}\t${out.buf.length}\tq${quality}`);
      }
    }
  }
  fs.writeFileSync(DATA_OUTPUT, renderModule({ width, height, quad, tiles }));
  return { quad, report };
}

export function renderModule({ width, height, quad, tiles }) {
  const tileData = tiles.map((t) => ({
    id: t.id,
    top: t.top,
    height: t.height,
    avif: t.files.avif.map((f) => `${f.src} ${f.w}w`).join(', '),
    webp: t.files.webp.map((f) => `${f.src} ${f.w}w`).join(', '),
    fallback: t.files.webp[1].src,
    fallbackWidth: t.files.webp[1].w,
    fallbackHeight: t.files.webp[1].h,
  }));
  return [
    '// GENERATED by scripts/build-hero-scene.mjs from data/home/hero-scene/workbench.png. Do not edit by hand; re-run the script.',
    '// The homepage hero scene: an AI-made photo (IPTC trainedAlgorithmicMedia) of a laptop on a plumber\'s workbench.',
    '',
    'export type ScenePoint = readonly [number, number];',
    '',
    'export const HERO_SCENE = {',
    `  width: ${width},`,
    `  height: ${height},`,
    '  /** The laptop screen in scene px, fitted to the green master: top-left, top-right, bottom-right, bottom-left. */',
    `  screen: [${quad.map((p) => `[${p[0]}, ${p[1]}]`).join(', ')}] as readonly [ScenePoint, ScenePoint, ScenePoint, ScenePoint],`,
    '  /** Overlapping horizontal bands (each smaller on screen than a headline line, so the photo is never LCP). */',
    `  tiles: ${JSON.stringify(tileData, null, 2).replace(/\n/g, '\n  ')},`,
    '} as const;',
    '',
  ].join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { quad, report } = await build(process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_MASTER);
  console.log('screen', JSON.stringify(quad));
  for (const r of report) console.log(r);
}

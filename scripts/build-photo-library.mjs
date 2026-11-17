#!/usr/bin/env node
// Site Bot per-service AI atmosphere hero photos (Eitan 2026-11-17, Fable 5.2 plan): builds the served library from the
// approved sources. Deterministic (same sources + same sharp build = the same bytes and the same manifest; no timestamps).
//
//   node scripts/build-photo-library.mjs [trade ...]        build (default: every trade with an approved-*.json)
//   node scripts/build-photo-library.mjs --check [trade ...] rebuild in memory, fail if anything on disk differs
//
// In:  data/photo-library/<trade>/approved-<date>.json (the newest by name) + the PNGs it lists. The sources stay under
//      data/ (tracked, never traced into a build: next.config.ts excludes data/**, and production replaces data/ with the
//      runtime-data link).
// Out: assets/photo-library/<trade>/library.json (manifest: services -> variant ids, fallback, per-variant images with
//      sha256) and assets/photo-library/<trade>/img/hero-<sha12>-<width>.{avif,webp} (siteLookImages.buildHeroVariants:
//      the same widths, budget and encoders as an owner hero photo). The deploy route traces only these (next.config.ts
//      outputFileTracingIncludes) and re-checks every served file's sha256 at load (src/lib/site-bot/heroLibraryStore.ts).
//
// Gates: every listed file exists, is listed once, is not in `dropped`, and every PNG in the folder is listed or dropped.
// Each photo runs the hero scorer; landscape / width / text-zone detail / white-text contrast are hard gates; `blurry` is
// recorded as advisory (the Laplacian metric reads smooth, minimal AI scenes as soft; it was calibrated on owner photos).
// HEBREW-SAFETY: zero Hebrew bytes.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createTsRequire } from './lib/ts-require.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_ROOT = path.join(ROOT, 'data', 'photo-library');
export const OUT_ROOT = path.join(ROOT, 'assets', 'photo-library');
const ADVISORY_GATES = new Set(['blurry']);
const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/;

/** The newest approval file of a trade folder (approved-YYYY-MM-DD.json, name order). */
export function approvalFile(trade) {
  const dir = path.join(SOURCE_ROOT, trade);
  const files = fs.readdirSync(dir).filter((f) => /^approved-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!files.length) throw new Error(`photo-library: ${trade} has no approved-*.json`);
  return path.join(dir, files.at(-1));
}

const idOf = (file) => {
  if (!/^[a-z0-9][a-z0-9-]*\.png$/.test(file)) throw new Error(`photo-library: unexpected file name ${file}`);
  return file.slice(0, -4);
};

/**
 * Validates an approval and returns the plan: services (standard / thermalCamera id lists), fallback ids and the variant
 * sources, in a stable order. Throws on any mismatch with the folder.
 */
export function planFromApproval(trade, approval, folderFiles) {
  if (approval?.trade !== trade) throw new Error(`photo-library: ${trade} approval names trade ${approval?.trade}`);
  const dropped = new Set(Object.keys(approval.dropped ?? {}));
  const listed = [];
  const services = {};
  for (const [service, value] of Object.entries(approval.services ?? {})) {
    if (!SAFE_ID.test(service)) throw new Error(`photo-library: bad service id ${service}`);
    if (Array.isArray(value)) {
      services[service] = { standard: value.map(idOf) };
      listed.push(...value);
    } else if (value && typeof value === 'object' && Array.isArray(value.noCamera)) {
      // A camera / noCamera split: noCamera is the standard list, camera shows a thermal camera.
      const extra = Object.keys(value).filter((k) => k !== 'camera' && k !== 'noCamera');
      if (extra.length) throw new Error(`photo-library: ${service} has unknown lists ${extra.join(',')}`);
      services[service] = { standard: value.noCamera.map(idOf), ...(Array.isArray(value.camera) ? { thermalCamera: value.camera.map(idOf) } : {}) };
      listed.push(...value.noCamera, ...(value.camera ?? []));
    } else {
      throw new Error(`photo-library: ${service} must be a list or a camera / noCamera split`);
    }
  }
  const fallback = (approval.tradeFallback ?? []).map(idOf);
  listed.push(...(approval.tradeFallback ?? []));
  const seen = new Set();
  for (const file of listed) {
    if (seen.has(file)) throw new Error(`photo-library: ${file} is listed twice`);
    seen.add(file);
    if (dropped.has(file)) throw new Error(`photo-library: ${file} is both listed and dropped`);
    if (!folderFiles.includes(file)) throw new Error(`photo-library: ${file} is listed but missing`);
  }
  const strays = folderFiles.filter((f) => f.endsWith('.png') && !seen.has(f) && !dropped.has(f));
  if (strays.length) throw new Error(`photo-library: unlisted photos in ${trade}: ${strays.join(', ')}`);
  const thermal = new Set(Object.values(services).flatMap((s) => s.thermalCamera ?? []));
  const sources = [...seen].sort().map((file) => ({ id: idOf(file), file, equipment: thermal.has(idOf(file)) ? 'thermal-camera' : null, hands: /(?:^|-)hand(?:-|$)/.test(idOf(file)) }));
  return { services, fallback, sources };
}

const sortedObject = (obj) => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** Builds one trade in memory: { manifest, files } (files keyed img/<name>). */
export async function buildTrade(trade) {
  const tsRequire = createTsRequire();
  const images = tsRequire('src/lib/site-bot/siteLookImages.ts');
  const sharpVersion = createRequire(import.meta.url)('sharp/package.json').version;
  const approvalPath = approvalFile(trade);
  const approvalBytes = fs.readFileSync(approvalPath);
  const approval = JSON.parse(approvalBytes.toString('utf8'));
  const dir = path.join(SOURCE_ROOT, trade);
  const plan = planFromApproval(trade, approval, fs.readdirSync(dir).sort());
  const variants = {};
  const files = {};
  for (const source of plan.sources) {
    const bytes = fs.readFileSync(path.join(dir, source.file));
    const score = await images.scoreHeroPhoto(bytes);
    const hard = score.reasons.filter((r) => !ADVISORY_GATES.has(r));
    if (hard.length) throw new Error(`photo-library: ${source.file} fails the hero gates: ${hard.join(', ')}`);
    const built = await images.buildHeroVariants(bytes);
    for (const [name, data] of Object.entries(built.files)) files[name] = data;
    variants[source.id] = {
      source: source.file,
      sourceSha256: images.sha256(bytes),
      aiGenerated: true,
      kind: 'atmosphere',
      people: false,
      faces: false,
      hands: source.hands,
      equipment: source.equipment,
      score: { contrast: score.contrast, textZoneDetail: score.textZoneDetail, sharpness: score.sharpness, advisory: score.reasons },
      images: built.images.map(({ width, height, avif, webp, avifBytes, webpBytes, avifSha256, webpSha256 }) => ({ width, height, avif, webp, avifBytes, webpBytes, avifSha256, webpSha256 })),
    };
  }
  const manifest = {
    _generated: `scripts/build-photo-library.mjs from data/photo-library/${trade}/${path.basename(approvalPath)}; do not edit by hand`,
    version: 1,
    trade,
    approval: { file: `data/photo-library/${trade}/${path.basename(approvalPath)}`, sha256: images.sha256(approvalBytes), approvedAt: approval.approvedAt, approvedBy: approval.approvedBy, rule: approval.rule },
    use: 'hero background only; never gallery, About, og:image, schema image or Google Business Profile',
    builtWith: { sharp: sharpVersion },
    services: sortedObject(plan.services),
    fallback: plan.fallback,
    variants: sortedObject(variants),
  };
  return { manifest, files };
}

const manifestText = (manifest) => `${JSON.stringify(manifest, null, 2)}\n`;

export function writeTrade(trade, { manifest, files }) {
  const out = path.join(OUT_ROOT, trade);
  const img = path.join(out, 'img');
  fs.mkdirSync(img, { recursive: true });
  for (const name of fs.readdirSync(img)) if (!(`img/${name}` in files)) fs.rmSync(path.join(img, name));
  for (const [name, data] of Object.entries(files)) fs.writeFileSync(path.join(out, name), data);
  fs.writeFileSync(path.join(out, 'library.json'), manifestText(manifest));
}

/** Differences between a fresh in-memory build and the files on disk ([] = in sync). */
export function diffTrade(trade, { manifest, files }) {
  const out = path.join(OUT_ROOT, trade);
  const problems = [];
  const onDisk = fs.existsSync(path.join(out, 'library.json')) ? fs.readFileSync(path.join(out, 'library.json'), 'utf8') : null;
  if (onDisk !== manifestText(manifest)) problems.push(`${trade}/library.json differs`);
  const img = path.join(out, 'img');
  const present = fs.existsSync(img) ? fs.readdirSync(img).map((n) => `img/${n}`) : [];
  for (const name of present) if (!(name in files)) problems.push(`${trade}/${name} is stale`);
  for (const [name, data] of Object.entries(files)) {
    const file = path.join(out, name);
    if (!fs.existsSync(file) || !fs.readFileSync(file).equals(data)) problems.push(`${trade}/${name} differs`);
  }
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const named = args.filter((a) => !a.startsWith('--'));
  const trades = named.length ? named : fs.readdirSync(SOURCE_ROOT).filter((t) => SAFE_ID.test(t) && fs.statSync(path.join(SOURCE_ROOT, t)).isDirectory()).sort();
  let failed = false;
  for (const trade of trades) {
    const built = await buildTrade(trade);
    const count = Object.keys(built.manifest.variants).length;
    const bytes = Object.values(built.files).reduce((n, b) => n + b.length, 0);
    if (check) {
      const problems = diffTrade(trade, built);
      if (problems.length) { failed = true; console.error(`photo-library ${trade}: OUT OF SYNC\n  ${problems.join('\n  ')}`); }
      else console.log(`photo-library ${trade}: in sync (${count} photos, ${Object.keys(built.files).length} files, ${Math.round(bytes / 1024)} KB)`);
    } else {
      writeTrade(trade, built);
      const advisory = Object.entries(built.manifest.variants).filter(([, v]) => v.score.advisory.length).map(([id, v]) => `${id} (${v.score.advisory.join(',')})`);
      console.log(`photo-library ${trade}: ${count} photos, ${Object.keys(built.files).length} files, ${Math.round(bytes / 1024)} KB${advisory.length ? `; advisory: ${advisory.join(', ')}` : ''}`);
    }
  }
  if (failed) process.exit(1);
}

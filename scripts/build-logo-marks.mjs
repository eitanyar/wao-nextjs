#!/usr/bin/env node
// Site Bot logo marks: builds the two generated inputs of src/lib/lp/siteLogo.ts from the approved, traced marks.
//
//   node scripts/build-logo-marks.mjs            write both files
//   node scripts/build-logo-marks.mjs --check    exit 1 when a generated file is stale (no writes)
//
// 1. src/lib/lp/logoMarks/marks.generated.json: every approved mark (approved-picks-2026-11-17.json; only those, all of
//    them) optimised: the potrace group transform is folded into the coordinates, the coordinates are rounded to whole
//    viewBox units (the traced grid is 0.1 unit; 1 unit is ~0.1 px at a 64 px tall mark), each subpath is written
//    relative, degenerate segments are dropped, identical (fill, d) paths are deduped (the LAST copy is kept: painting an
//    opaque shape twice ends with the last paint, so dropping the earlier copy cannot change a pixel), and subpaths
//    thinner than SLIVER_PX or smaller than DOT_PX2 (both measured at a 64 px tall render) are dropped. Fills become
//    var(--mark-primary) / var(--mark-accent) / var(--mark-paper) without fallbacks (siteLogo always sets the three).
//    The visual check (scripts/check-logo-marks.mjs) renders source vs output at 64 px and 16 px.
// 2. src/lib/lp/logoMarks/trade-terms.generated.json: the Hebrew detection terms per trade, COPIED by script from files
//    already in the repo (never typed): the GBP taxonomy (src/data/gbp-categories-il.json) by category id, the
//    market-scanner professions (config/market-scanner/professions.json) by slug, and the licensed-trades copy
//    (docs/copy/site-bot-licensed-trades-2026-11-10.json) by index range with an asserted count. Every term carries its
//    source; logoMarks.test.ts re-checks each term byte-exact against that source.
//
// HEBREW-SAFETY: this script contains ZERO Hebrew bytes. Deterministic: same inputs, same bytes.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MARKS_DIR = path.join(ROOT, 'src/lib/lp/logoMarks');
const SVG_DIR = path.join(MARKS_DIR, 'svg');
const APPROVED = 'approved-picks-2026-11-17.json';
const OUT_MARKS = path.join(MARKS_DIR, 'marks.generated.json');
const OUT_TERMS = path.join(MARKS_DIR, 'trade-terms.generated.json');

/** Subpaths thinner than this (px, at a 64 px tall render) are dropped: potrace slivers. */
const SLIVER_PX = 0.08;
/** Subpaths with a smaller area than this (px^2, at a 64 px tall render) are dropped: specks. */
const DOT_PX2 = 0.12;
const RENDER_PX = 64;

// ─────────────────────────────────────────────────────────────────────────
// SVG optimiser
// ─────────────────────────────────────────────────────────────────────────

const FILL_NAMES = ['primary', 'accent', 'paper'];

function parseTransform(value) {
  const t = /^translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)$/.exec(value);
  if (!t) throw new Error(`unexpected transform: ${value}`);
  const [tx, ty, sx, sy] = t.slice(1).map(Number);
  return { tx, ty, sx, sy };
}

/** Subpaths of a path in absolute, transformed coordinates: [{ start:[x,y], segs:[{c:'L'|'C', p:[...]}] }]. */
function parsePath(d, tf) {
  const tokens = d.match(/[MmLlCcZzHhVv]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const map = (x, y) => [tf.tx + tf.sx * x, tf.ty + tf.sy * y];
  const subpaths = [];
  let cmd = null; let i = 0; let cx = 0; let cy = 0; let sx = 0; let sy = 0; let current = null;
  const num = () => { const v = Number(tokens[i++]); if (!Number.isFinite(v)) throw new Error(`bad number in ${d.slice(0, 40)}`); return v; };
  while (i < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[i])) cmd = tokens[i++];
    else if (cmd === null) throw new Error('path does not start with a command');
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case 'M': {
        const x = num() + (rel ? cx : 0); const y = num() + (rel ? cy : 0);
        cx = sx = x; cy = sy = y;
        current = { start: map(x, y), segs: [], closed: false };
        subpaths.push(current);
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'L': {
        const x = num() + (rel ? cx : 0); const y = num() + (rel ? cy : 0);
        current.segs.push({ c: 'L', p: map(x, y) }); cx = x; cy = y;
        break;
      }
      case 'H': { const x = num() + (rel ? cx : 0); current.segs.push({ c: 'L', p: map(x, cy) }); cx = x; break; }
      case 'V': { const y = num() + (rel ? cy : 0); current.segs.push({ c: 'L', p: map(cx, y) }); cy = y; break; }
      case 'C': {
        const v = [num(), num(), num(), num(), num(), num()];
        const abs = rel ? v.map((n, k) => n + (k % 2 ? cy : cx)) : v;
        current.segs.push({ c: 'C', p: [...map(abs[0], abs[1]), ...map(abs[2], abs[3]), ...map(abs[4], abs[5])] });
        cx = abs[4]; cy = abs[5];
        break;
      }
      case 'Z': current.closed = true; cx = sx; cy = sy; cmd = null; break;
      default: throw new Error(`unsupported command ${cmd}`);
    }
  }
  return subpaths;
}

/** Signed area and perimeter of a subpath (cubics sampled), in user units. */
function areaAndPerimeter(sp) {
  const pts = [sp.start];
  let [x0, y0] = sp.start;
  for (const seg of sp.segs) {
    if (seg.c === 'L') { pts.push(seg.p); [x0, y0] = seg.p; continue; }
    const [x1, y1, x2, y2, x3, y3] = seg.p;
    for (let k = 1; k <= 12; k++) {
      const t = k / 12; const u = 1 - t;
      pts.push([u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]);
    }
    x0 = x3; y0 = y3;
  }
  let area = 0; let perimeter = 0;
  for (let k = 0; k < pts.length; k++) {
    const [ax, ay] = pts[k]; const [bx, by] = pts[(k + 1) % pts.length];
    area += ax * by - bx * ay;
    perimeter += Math.hypot(bx - ax, by - ay);
  }
  return { area: Math.abs(area) / 2, perimeter };
}

/**
 * Coordinates are rounded to whole viewBox units. Measured 2026-11-17 (scripts/check-logo-marks.mjs): mean channel delta
 * 0.51 at 64 px vs 1.88 for the source moved 0.1 px; half units cost +170 KB for no visible gain.
 */
const snap = v => Math.round(v);

function fmt(n) {
  const v = snap(n);
  return v === 0 ? '0' : String(v);
}

/** Numbers joined with the fewest separators (a minus sign separates on its own). */
function joinNumbers(values) {
  let out = '';
  for (const [k, v] of values.entries()) out += (k === 0 || v.startsWith('-')) ? v : ` ${v}`;
  return out;
}

/** Writes subpaths (absolute coordinates) as a compact relative d, rounding absolute points first (no drift). */
function writePath(subpaths) {
  let d = '';
  let px = 0; let py = 0;
  let first = true;
  for (const sp of subpaths) {
    const sx = snap(sp.start[0]); const sy = snap(sp.start[1]);
    d += first ? `M${joinNumbers([fmt(sx), fmt(sy)])}` : `m${joinNumbers([fmt(sx - px), fmt(sy - py)])}`;
    first = false;
    let cx = sx; let cy = sy; let last = '';
    for (const seg of sp.segs) {
      const p = seg.p.map(snap);
      const rel = p.map((v, k) => v - (k % 2 ? cy : cx));
      if (rel.every(v => v === 0)) continue;
      const letter = seg.c === 'L' ? 'l' : 'c';
      const nums = joinNumbers(rel.map(fmt));
      d += letter === last ? (nums.startsWith('-') ? nums : ` ${nums}`) : `${letter}${nums}`;
      last = letter;
      cx = p[p.length - 2]; cy = p[p.length - 1];
    }
    if (sp.closed) d += 'z';
    px = sx; py = sy;
  }
  return d;
}

export function optimiseSvg(source) {
  const vb = /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 (\d+) (\d+)">/.exec(source);
  if (!vb) throw new Error('unexpected svg root');
  const [width, height] = [Number(vb[1]), Number(vb[2])];
  const unitPx = RENDER_PX / height;
  const groups = [...source.matchAll(/<g transform="([^"]*)" fill="var\(--mark-([a-z]+),#[0-9a-f]{3,6}\)">(.*?)<\/g>/gs)];
  const rest = source.replace(/<g transform="[^"]*" fill="[^"]*">.*?<\/g>/gs, '');
  if (rest.replace(/\s+/g, '') !== `${vb[0].replace(/\s+/g, '')}</svg>`) throw new Error('unexpected svg content outside the fill groups');
  const items = [];
  const stats = { slivers: 0, specks: 0, emptyPaths: 0, dupes: 0, subpaths: 0 };
  for (const [, transform, fill, inner] of groups) {
    if (!FILL_NAMES.includes(fill)) throw new Error(`unknown fill ${fill}`);
    const tf = parseTransform(transform);
    for (const [, d] of inner.matchAll(/<path d="([^"]*)"\/>/g)) {
      const kept = parsePath(d, tf).filter(sp => {
        stats.subpaths += 1;
        const { area, perimeter } = areaAndPerimeter(sp);
        const areaPx = area * unitPx * unitPx;
        const thicknessPx = perimeter > 0 ? (2 * area / perimeter) * unitPx : 0;
        if (areaPx < DOT_PX2) { stats.specks += 1; return false; }
        if (thicknessPx < SLIVER_PX) { stats.slivers += 1; return false; }
        return true;
      });
      if (!kept.length) { stats.emptyPaths += 1; continue; }
      items.push({ fill, d: writePath(kept) });
    }
  }
  // Dedupe identical (fill, d): keep the last copy.
  const lastIndex = new Map(items.map((item, k) => [`${item.fill}|${item.d}`, k]));
  const unique = items.filter((item, k) => lastIndex.get(`${item.fill}|${item.d}`) === k);
  stats.dupes = items.length - unique.length;
  // Group consecutive paths of the same fill (paint order kept).
  let body = '';
  for (let k = 0; k < unique.length;) {
    let j = k;
    while (j < unique.length && unique[j].fill === unique[k].fill) j++;
    const run = unique.slice(k, j);
    body += run.length === 1
      ? `<path fill="var(--mark-${run[0].fill})" d="${run[0].d}"/>`
      : `<g fill="var(--mark-${run[0].fill})">${run.map(item => `<path d="${item.d}"/>`).join('')}</g>`;
    k = j;
  }
  return { viewBox: `0 0 ${width} ${height}`, body, stats };
}

// ─────────────────────────────────────────────────────────────────────────
// Trade terms (copied from files in the repo, never typed)
// ─────────────────────────────────────────────────────────────────────────

/** Trade -> GBP category ids (src/data/gbp-categories-il.json): heName + synonyms are copied. */
export const TRADE_GBP_CATEGORIES = {
  'plumber': ['plumber', 'drainage_service'],
  'electrician': ['electrician', 'electrical_installation_service', 'lighting_contractor'],
  'locksmith': ['locksmith', 'car_locksmith'],
  'cleaner': ['cleaner', 'house_cleaning_service', 'carpet_cleaning_service', 'window_cleaning_service'],
  'air-conditioning': ['hvac_contractor', 'air_conditioning_repair_service'],
  'appliance-repair': ['appliance_repair_service'],
  'barber-hairdresser': ['hair_salon', 'barber_shop'],
  'car-detailing': ['car_detailer', 'car_wash'],
  'car-mechanic': ['auto_repair_shop', 'car_repair_and_maintenance', 'auto_electrical_service'],
  'carpenter': ['carpenter', 'furniture_maker', 'kitchen_remodeler'],
  'computer-phone-repair': ['computer_repair_service', 'cell_phone_store'],
  'dog-trainer-groomer': ['dog_trainer', 'pet_groomer'],
  'driving-instructor': ['driving_school', 'motorcycle_driving_school'],
  'flooring-tiler': ['tile_contractor', 'flooring_contractor'],
  'gardener': ['gardener', 'landscape_designer', 'tree_service'],
  'gas-technician': [],
  'glazier': ['glazier'],
  'handyman': ['handyman'],
  'metalwork-welder': ['metal_fabricator', 'fence_contractor'],
  'movers': ['moving_company'],
  'painter': ['painter'],
  'personal-trainer': ['personal_trainer'],
  'pest-control': ['pest_control_service'],
  'photographer': ['photographer', 'commercial_photographer'],
  'renovation-contractor': ['general_contractor', 'bathroom_remodeler', 'dry_wall_contractor', 'plasterer'],
  'security-cameras': ['security_system_installer'],
  'solar-water-heater': ['solar_energy_equipment_supplier'],
  'upholstery': [],
  'waterproofing-roofing': ['roofer', 'waterproofing_service'],
  'windows-shutters': ['window_installation_service'],
};

/** Trade -> market-scanner profession slugs (config/market-scanner/professions.json): trade_he + terms are copied. */
export const TRADE_PROFESSIONS = {
  'plumber': ['plumber'], 'electrician': ['electrician'], 'air-conditioning': ['ac-repair'], 'locksmith': ['locksmith'],
  'pest-control': ['pest-control'], 'movers': ['movers'], 'waterproofing-roofing': ['roofing'], 'carpenter': ['carpenter', 'kitchens'],
  'painter': ['painter'], 'flooring-tiler': ['tiling'], 'windows-shutters': ['aluminum'], 'renovation-contractor': ['renovation'],
  'metalwork-welder': ['gates-fencing'],
};

/** Professions whose bare trade_he is a material, not a trade (it names pergolas and scaffolding too): terms only. */
const PROFESSION_NAME_TOO_BROAD = new Set(['aluminum']);

/** Trade -> index ranges of licensedTrades (docs/copy/site-bot-licensed-trades-2026-11-10.json), [from, to] inclusive. */
export const TRADE_LICENSED = {
  'electrician': [[0, 4]],
  'gas-technician': [[5, 13]],
  'pest-control': [[14, 17]],
  'driving-instructor': [[76, 85]],
};
/**
 * Exclusion spans (licenseExclude index ranges, plus every unmapped GBP category name, see buildTradeTerms): a match
 * overlapping one is dropped unless it covers it whole.
 */
export const EXCLUDE_LICENSED = [[13, 20]];

const LICENSED_FILE = 'docs/copy/site-bot-licensed-trades-2026-11-10.json';
const GBP_FILE = 'src/data/gbp-categories-il.json';
const PROFESSIONS_FILE = 'config/market-scanner/professions.json';

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
}

export function buildTradeTerms(trades) {
  const gbp = new Map(readJson(GBP_FILE).map(category => [category.categoryId, category]));
  const professions = new Map(readJson(PROFESSIONS_FILE).professions.map(item => [item.slug, item]));
  const licensed = readJson(LICENSED_FILE);
  const out = {};
  for (const trade of trades) {
    const terms = new Map();
    const add = (term, source) => {
      const clean = term.trim();
      if (clean && !terms.has(clean)) terms.set(clean, source);
    };
    for (const id of TRADE_GBP_CATEGORIES[trade] ?? []) {
      const category = gbp.get(`gcid:${id}`);
      if (!category) throw new Error(`unknown GBP category ${id}`);
      add(category.heName, `${GBP_FILE}#gcid:${id}.heName`);
      category.synonyms.forEach((synonym, k) => add(synonym, `${GBP_FILE}#gcid:${id}.synonyms[${k}]`));
    }
    for (const slug of TRADE_PROFESSIONS[trade] ?? []) {
      const profession = professions.get(slug);
      if (!profession) throw new Error(`unknown profession ${slug}`);
      if (!PROFESSION_NAME_TOO_BROAD.has(slug)) add(profession.trade_he, `${PROFESSIONS_FILE}#${slug}.trade_he`);
      profession.terms.forEach((term, k) => add(term, `${PROFESSIONS_FILE}#${slug}.terms[${k}]`));
    }
    for (const [from, to] of TRADE_LICENSED[trade] ?? []) {
      if (to >= licensed.licensedTrades.length) throw new Error(`licensedTrades range ${from}-${to} out of bounds`);
      for (let k = from; k <= to; k++) add(licensed.licensedTrades[k], `${LICENSED_FILE}#licensedTrades[${k}]`);
    }
    out[trade] = [...terms].map(([term, source]) => ({ term, source }));
  }
  const excludes = EXCLUDE_LICENSED.flatMap(([from, to]) => Array.from({ length: to - from + 1 }, (_, k) => ({
    term: licensed.licenseExclude[from + k], source: `${LICENSED_FILE}#licenseExclude[${from + k}]`,
  })));
  // The names of every GBP category no trade maps to: a niche naming one of them (eyeglass frames, oil paints, car
  // mirrors, scaffolding) is not confidently a mapped trade, even when a trade term sits inside the phrase.
  const mapped = new Set(Object.values(TRADE_GBP_CATEGORIES).flat().map(id => `gcid:${id}`));
  const seen = new Set(excludes.map(entry => entry.term));
  for (const [id, category] of gbp) {
    if (mapped.has(id)) continue;
    for (const [key, term] of [['heName', category.heName], ...category.synonyms.map((synonym, k) => [`synonyms[${k}]`, synonym])]) {
      const clean = term.trim();
      if (clean && !seen.has(clean)) { seen.add(clean); excludes.push({ term: clean, source: `${GBP_FILE}#${id}.${key}` }); }
    }
  }
  return { excludes, trades: out };
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

function main() {
  const check = process.argv.includes('--check');
  const approved = JSON.parse(fs.readFileSync(path.join(MARKS_DIR, APPROVED), 'utf8'));
  const approvedIds = Object.values(approved.trades).flat();
  const files = fs.readdirSync(SVG_DIR).filter(name => name.endsWith('.svg')).map(name => name.slice(0, -4)).sort();
  const missing = approvedIds.filter(id => !files.includes(id));
  if (missing.length) throw new Error(`approved marks without an SVG: ${missing.join(', ')}`);
  for (const [trade, ids] of Object.entries(approved.trades)) {
    for (const id of ids) if (!id.startsWith(`${trade}-`)) throw new Error(`${id} is listed under ${trade}`);
  }
  const unapproved = files.filter(id => !approvedIds.includes(id));
  if (unapproved.length) console.log(`  not approved (never rendered, not built): ${unapproved.join(', ')}`);

  const marks = {};
  let before = 0; let after = 0;
  const totals = { slivers: 0, specks: 0, emptyPaths: 0, dupes: 0, subpaths: 0 };
  for (const id of [...approvedIds].sort()) {
    const source = fs.readFileSync(path.join(SVG_DIR, `${id}.svg`), 'utf8');
    const { viewBox, body, stats } = optimiseSvg(source);
    marks[id] = { viewBox, body };
    before += Buffer.byteLength(source);
    after += Buffer.byteLength(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`);
    for (const key of Object.keys(totals)) totals[key] += stats[key];
  }
  const marksJson = `${JSON.stringify({ generatedBy: 'scripts/build-logo-marks.mjs', approved: `src/lib/lp/logoMarks/${APPROVED}`, marks }, null, 1)}\n`;
  const termsJson = `${JSON.stringify({ generatedBy: 'scripts/build-logo-marks.mjs', ...buildTradeTerms(Object.keys(approved.trades)) }, null, 1)}\n`;

  const outputs = [[OUT_MARKS, marksJson], [OUT_TERMS, termsJson]];
  if (check) {
    const stale = outputs.filter(([file, bytes]) => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== bytes);
    if (stale.length) { console.error(`stale: ${stale.map(([file]) => path.relative(ROOT, file)).join(', ')}`); process.exit(1); }
    console.log('logo marks: generated files are current');
    return;
  }
  for (const [file, bytes] of outputs) fs.writeFileSync(file, bytes);
  console.log(`logo marks: ${approvedIds.length} marks, ${before} B -> ${after} B as standalone SVGs (${(100 * after / before).toFixed(1)}%)`);
  console.log(`  subpaths ${totals.subpaths}, dropped slivers ${totals.slivers}, specks ${totals.specks}, emptied paths ${totals.emptyPaths}, duplicate paths ${totals.dupes}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

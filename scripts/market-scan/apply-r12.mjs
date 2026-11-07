#!/usr/bin/env node
// Merges the spec's "R12. Config for the engineer" JSON block into
// config/market-scanner/run-config.json. The block is parsed straight out of the spec file, so
// every Hebrew string (category rules, generic categories, title terms) is copied byte-exact;
// this file contains no Hebrew literals. Idempotent: re-running yields the same file.
//   node scripts/market-scan/apply-r12.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { SPEC_PATH, specSha256 } from './lib/spec.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const CONFIG = path.join(ROOT, 'config/market-scanner/run-config.json');

export function extractR12(specText) {
  const start = specText.indexOf('\n## R12.');
  if (start < 0) throw new Error('spec has no "## R12." section');
  const rest = specText.slice(start);
  const open = rest.indexOf('```json\n');
  const close = rest.indexOf('\n```', open + 8);
  if (open < 0 || close < 0) throw new Error('R12 has no ```json block');
  return JSON.parse(rest.slice(open + 8, close));
}

// R12 merge rules: replace stage2.category_allowlist with category_rules; drop the 15z zoom,
// prospect_min_gaps, prospect_pass, prospect_kill_below; keep everything not listed.
export function mergeR12(run, r12, specSha) {
  const out = structuredClone(run);
  out.languages = r12.languages;
  out.stage1 = { ...out.stage1, ...r12.stage1 };
  const stage2 = { ...out.stage2 };
  for (const k of ['category_allowlist', 'category_allowlist_note', 'prospect_min_gaps', 'prospect_pass', 'prospect_kill_below']) delete stage2[k];
  out.stage2 = { ...stage2, ...r12.stage2 };
  out.homepage_check = r12.homepage_check;
  out.pilot = r12.pilot;
  out.r12_applied = { spec: SPEC_PATH, spec_sha256: specSha, date: '2026-11-07', by: 'scripts/market-scan/apply-r12.mjs' };
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const specText = fs.readFileSync(path.join(ROOT, SPEC_PATH), 'utf8');
  const r12 = extractR12(specText);
  const current = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const merged = mergeR12(current, r12, specSha256(specText)); // idempotent on an already-merged file
  const text = `${JSON.stringify(merged, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    process.stdout.write(fs.readFileSync(CONFIG, 'utf8') === text ? 'run-config.json up to date\n' : 'run-config.json differs\n');
  } else {
    fs.writeFileSync(CONFIG, text);
    process.stdout.write(`${JSON.stringify({ category_rules: Object.keys(merged.stage2.category_rules).length, pilot_cells: merged.pilot.cells.length, zooms: merged.stage2.zooms })}\n`);
  }
}

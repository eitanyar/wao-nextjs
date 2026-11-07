#!/usr/bin/env node
// Merges the spec's "Revision 3 - 3.8 Config for the engineer" JSON block into
// config/market-scanner/run-config.json, with the same rules as apply-r2-12.mjs (replace existing
// keys, append `*_append` arrays to their base list, merge nested objects recursively). The block
// is parsed straight out of the spec file, so every Hebrew stem (title_exclude, the movers category
// exclude, title_chain_stems) is copied byte-exact; this file has no Hebrew literals.
// Idempotent: re-running yields the same file.
//   node scripts/market-scan/apply-r3-8.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { SPEC_PATH, specSha256 } from './lib/spec.mjs';
import { mergeInto } from './apply-r2-12.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const CONFIG = path.join(ROOT, 'config/market-scanner/run-config.json');

export function extractR3_8(specText) {
  const start = specText.indexOf('\n## 3.8 ');
  if (start < 0) throw new Error('spec has no "## 3.8" section');
  const rest = specText.slice(start);
  const open = rest.indexOf('```json\n');
  const close = rest.indexOf('\n```', open + 8);
  if (open < 0 || close < 0) throw new Error('3.8 has no ```json block');
  return JSON.parse(rest.slice(open + 8, close));
}

export function mergeR3_8(run, patch, specSha) {
  const out = mergeInto(run, patch);
  out.r3_8_applied = { spec: SPEC_PATH, spec_sha256: specSha, date: '2026-11-07', by: 'scripts/market-scan/apply-r3-8.mjs' };
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const specText = fs.readFileSync(path.join(ROOT, SPEC_PATH), 'utf8');
  const patch = extractR3_8(specText);
  const current = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const merged = mergeR3_8(current, patch, specSha256(specText));
  const text = `${JSON.stringify(merged, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    process.stdout.write(fs.readFileSync(CONFIG, 'utf8') === text ? 'run-config.json up to date\n' : 'run-config.json differs\n');
  } else {
    fs.writeFileSync(CONFIG, text);
    process.stdout.write(`${JSON.stringify({ precedence: merged.stage2.lf_field_precedence, O: merged.stage2.organic_factor, network: merged.stage2.lead_gen_network, weights: merged.homepage_check.weights })}\n`);
  }
}

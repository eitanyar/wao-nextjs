#!/usr/bin/env node
// Merges the spec's "Revision 2 - 2.12 Config for the engineer" JSON block into
// config/market-scanner/run-config.json. The block is parsed straight out of the spec file, so
// every Hebrew string (category rules) is copied byte-exact; this file has no Hebrew literals.
// Merge rules (spec 2.12): replace keys that already exist, append `*_append` arrays to their
// base list (base = key without the suffix, de-duplicated, order kept), add everything else.
// Nested objects merge recursively, so category_rules.roofing.conditional replaces only that list.
// Idempotent: re-running yields the same file.
//   node scripts/market-scan/apply-r2-12.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { SPEC_PATH, specSha256 } from './lib/spec.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const CONFIG = path.join(ROOT, 'config/market-scanner/run-config.json');

export function extractR2_12(specText) {
  const start = specText.indexOf('\n## 2.12 ');
  if (start < 0) throw new Error('spec has no "## 2.12" section');
  const rest = specText.slice(start);
  const open = rest.indexOf('```json\n');
  const close = rest.indexOf('\n```', open + 8);
  if (open < 0 || close < 0) throw new Error('2.12 has no ```json block');
  return JSON.parse(rest.slice(open + 8, close));
}

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

function mergeInto(base, patch) {
  const out = structuredClone(base ?? {});
  for (const [k, v] of Object.entries(patch)) {
    if (k.endsWith('_append') && Array.isArray(v)) {
      const target = k.slice(0, -'_append'.length);
      out[target] = [...new Set([...(out[target] ?? []), ...v])];
      continue;
    }
    out[k] = isObj(v) && isObj(out[k]) ? mergeInto(out[k], v) : structuredClone(v);
  }
  return out;
}

export function mergeR2_12(run, patch, specSha) {
  const out = mergeInto(run, patch);
  out.r2_12_applied = { spec: SPEC_PATH, spec_sha256: specSha, date: '2026-11-07', by: 'scripts/market-scan/apply-r2-12.mjs', cap_note: 'caps_usd.stage2-full = 6 approved by Eitan 2026-11-07' };
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const specText = fs.readFileSync(path.join(ROOT, SPEC_PATH), 'utf8');
  const patch = extractR2_12(specText);
  const current = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const merged = mergeR2_12(current, patch, specSha256(specText));
  const text = `${JSON.stringify(merged, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    process.stdout.write(fs.readFileSync(CONFIG, 'utf8') === text ? 'run-config.json up to date\n' : 'run-config.json differs\n');
  } else {
    fs.writeFileSync(CONFIG, text);
    process.stdout.write(`${JSON.stringify({ caps: merged.caps_usd, policy: merged.stage2.s3_missing_field_policy, directories: merged.stage2.organic_directories.length, media: merged.stage2.organic_media.length, not_a_site: merged.stage2.not_a_site.length })}\n`);
  }
}

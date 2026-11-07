#!/usr/bin/env node
// Applies spec 3.1.6 (dead-site guard on the listed URL) to config/market-scanner/run-config.json
// (engineer-owned config; no Hebrew). The borderline band is parsed out of the 3.1.6 prose, the
// rest are engineer switch names for rules stated in that section:
//   homepage_check.site_dead_rule "listed_url"   parked / 404-410 count as site_dead only when the
//                                                record judged the listed URL (root-listed), else
//                                                root_only_inconclusive (a site; w_b = failed)
//   homepage_check.fetch "listed_url"            online runs GET the listed URL, not the host root
//   stage2.s3_borderline_band [lo, hi]           s3_borderline flag (hand gate before the top 10)
//   stage2.prospect_same_phone_dedupe            "non_urgency": same E.164 phone counts once
//   stage2.city_hit_matcher                      "he_name_and_aliases": R8 city_hit = citiesNamedIn
// Idempotent: re-running yields the same file.
//   node scripts/market-scan/apply-r3-1-6.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { SPEC_PATH, specSha256 } from './lib/spec.mjs';
import { mergeInto } from './apply-r2-12.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const RUN = path.join(ROOT, 'config/market-scanner/run-config.json');

export function extractR3_1_6(specText) {
  const start = specText.indexOf('\n## 3.1.6 ');
  if (start < 0) throw new Error('spec has no "## 3.1.6" section');
  const next = specText.indexOf('\n## ', start + 1);
  const s = specText.slice(start, next < 0 ? undefined : next);
  const band = /joined S3 in \[(\d\.\d+), (\d\.\d+)\]/.exec(s);
  if (!band) throw new Error('3.1.6 borderline band not found');
  const lo = Number(band[1]);
  const hi = Number(band[2]);
  if (!(lo < hi)) throw new Error('3.1.6 bad borderline band');
  for (const must of ['root_only_inconclusive', 'listed_url', 'dns_nxdomain_confirmed', 'Same-phone duplicates', 'he_aliases']) if (!s.includes(must)) throw new Error(`3.1.6 prose lacks "${must}"`);
  return {
    homepage_check: { site_dead_rule: 'listed_url', fetch: 'listed_url' },
    stage2: { s3_borderline_band: [lo, hi], prospect_same_phone_dedupe: 'non_urgency', city_hit_matcher: 'he_name_and_aliases' },
  };
}

export function mergeR3_1_6(run, patch, specSha) {
  const out = mergeInto(run, patch);
  out.r3_1_6_applied = { spec: SPEC_PATH, spec_sha256: specSha, date: '2026-11-07', by: 'scripts/market-scan/apply-r3-1-6.mjs' };
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const specText = fs.readFileSync(path.join(ROOT, SPEC_PATH), 'utf8');
  const patch = extractR3_1_6(specText);
  const merged = mergeR3_1_6(JSON.parse(fs.readFileSync(RUN, 'utf8')), patch, specSha256(specText));
  const text = `${JSON.stringify(merged, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    process.stdout.write(fs.readFileSync(RUN, 'utf8') === text ? 'run-config.json up to date\n' : 'run-config.json differs\n');
  } else {
    fs.writeFileSync(RUN, text);
    process.stdout.write(`${JSON.stringify(patch)}\n`);
  }
}

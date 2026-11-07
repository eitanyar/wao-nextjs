#!/usr/bin/env node
// Applies spec "Revision 3.1" to config/market-scanner (engineer-owned config; Yonatan does not
// edit config/):
//   areas.json      3.1.1 `he_aliases` per city (the 3.1.1 ```json block, keyed by city slug), and
//                   3.1.4 `he_match_guard` for omer / sderot (prefix letters + the end word, sliced
//                   out of the 3.1.4 prose).
//   run-config.json 3.1.2 / 3.1.3 / 3.1.4 switches (no Hebrew).
// Every Hebrew string is parsed straight out of the spec file, so it is copied byte-exact; this
// file has no Hebrew literals. Idempotent: re-running yields the same files. Re-run after
// build-config.mjs (which regenerates areas.json without these fields).
//   node scripts/market-scan/apply-r3-1.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { SPEC_PATH, specSha256 } from './lib/spec.mjs';
import { mergeInto } from './apply-r2-12.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const AREAS = path.join(ROOT, 'config/market-scanner/areas.json');
const RUN = path.join(ROOT, 'config/market-scanner/run-config.json');

const section = (text, head, next) => {
  const start = text.indexOf(`\n${head}`);
  if (start < 0) throw new Error(`spec has no "${head}" section`);
  const end = text.indexOf(`\n${next}`, start + 1);
  return text.slice(start, end < 0 ? undefined : end);
};
const HEBREW_LETTER = /^[\u05d0-\u05ea]$/;
const HEBREW_WORD = /^[\u05d0-\u05ea]+$/;

// 3.1.1: slug -> [alias, ...]
export function extractR3_1_1(specText) {
  const s = section(specText, '## 3.1.1 ', '## 3.1.2 ');
  const open = s.indexOf('```json\n');
  const close = s.indexOf('\n```', open + 8);
  if (open < 0 || close < 0) throw new Error('3.1.1 has no ```json block');
  const aliases = JSON.parse(s.slice(open + 8, close));
  for (const [slug, list] of Object.entries(aliases)) {
    if (!Array.isArray(list) || !list.length || !list.every(x => typeof x === 'string' && x.trim())) throw new Error(`3.1.1 ${slug}: bad alias list`);
  }
  return aliases;
}
export const aliasCount = aliases => Object.values(aliases).reduce((n, l) => n + l.length, 0);

// 3.1.4 prefix guard: { omer: { he_name, prefix_letters }, sderot: { he_name, prefix_letters, end_words } }
export function extractR3_1_4(specText) {
  const s = section(specText, '## 3.1.4 ', '## 3.1.5 ');
  const omer = /For `omer` \(([^)]+)\), a hit counts only when the letter right before it is (\S), (\S) or (\S)\./.exec(s);
  const sderot = /For\s+`sderot` \(([^,]+),/.exec(s);
  const word = /or the word "([^"]+)"/.exec(s);
  if (!omer || !sderot || !word) throw new Error('3.1.4 prefix-guard prose not found');
  const letters = omer.slice(2, 5);
  if (!letters.every(l => HEBREW_LETTER.test(l))) throw new Error('3.1.4 prefix letters are not single Hebrew letters');
  if (![omer[1], sderot[1], word[1]].every(w => HEBREW_WORD.test(w))) throw new Error('3.1.4 names are not single Hebrew words');
  return {
    omer: { he_name: omer[1], prefix_letters: letters },
    sderot: { he_name: sderot[1], prefix_letters: letters, end_words: [word[1]] },
  };
}

export function applyAreas(areas, aliases, guards) {
  const bySlug = new Map(areas.regions.flatMap(r => r.cities.map(c => [c.slug, c])));
  for (const slug of [...Object.keys(aliases), ...Object.keys(guards)]) if (!bySlug.has(slug)) throw new Error(`unknown city slug ${slug}`);
  for (const [slug, g] of Object.entries(guards)) if (bySlug.get(slug).he_name !== g.he_name) throw new Error(`3.1.4 ${slug}: spec name differs from areas.json he_name`);
  let written = 0;
  const regions = areas.regions.map(r => ({
    ...r,
    cities: r.cities.map(c => {
      const { he_aliases: _a, he_match_guard: _g, ...rest } = c;
      const out = {};
      for (const [k, v] of Object.entries(rest)) {
        out[k] = v;
        if (k !== 'he_name') continue;
        if (aliases[c.slug]) { out.he_aliases = [...aliases[c.slug]]; written += aliases[c.slug].length; }
        const g = guards[c.slug];
        if (g) out.he_match_guard = { prefix_letters: [...g.prefix_letters], ...(g.end_words ? { end: 'title_end_punct_or_word', end_words: [...g.end_words] } : {}) };
      }
      return out;
    }),
  }));
  return { areas: { ...areas, regions }, written };
}

// 3.1.2 / 3.1.3 / 3.1.4 switches (engineer config keys; values stated in the spec prose).
export const R3_1_RUN_PATCH = {
  stage2: {
    lf_site_dead_no_site: true, // 3.1.2: site_dead per homepage_check.site_dead -> has_site = false in s_b
    incumbent_never_prospect: 'destination_and_same_trade', // 3.1.3 (same-trade variant: IN)
    lead_gen_network: { multi_branch_min_votes: 150 }, // 3.1.4 display-only label
  },
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const specText = fs.readFileSync(path.join(ROOT, SPEC_PATH), 'utf8');
  const sha = specSha256(specText);
  const aliases = extractR3_1_1(specText);
  const guards = extractR3_1_4(specText);
  const { areas, written } = applyAreas(JSON.parse(fs.readFileSync(AREAS, 'utf8')), aliases, guards);
  const expected = aliasCount(aliases);
  if (written !== expected) throw new Error(`aliases written ${written} != spec block ${expected}`);
  const run = mergeInto(JSON.parse(fs.readFileSync(RUN, 'utf8')), R3_1_RUN_PATCH);
  run.r3_1_applied = { spec: SPEC_PATH, spec_sha256: sha, date: '2026-11-07', by: 'scripts/market-scan/apply-r3-1.mjs' };
  const areasText = `${JSON.stringify(areas, null, 2)}\n`;
  const runText = `${JSON.stringify(run, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    const same = fs.readFileSync(AREAS, 'utf8') === areasText && fs.readFileSync(RUN, 'utf8') === runText;
    process.stdout.write(same ? 'areas.json + run-config.json up to date\n' : 'config differs\n');
  } else {
    fs.writeFileSync(AREAS, areasText);
    fs.writeFileSync(RUN, runText);
    process.stdout.write(`${JSON.stringify({ alias_cities: Object.keys(aliases).length, aliases_in_spec: expected, aliases_written: written, guards: Object.keys(guards) })}\n`);
  }
}

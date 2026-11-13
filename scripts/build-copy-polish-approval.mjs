#!/usr/bin/env node
// Writes docs/copy/copy-polish-approved-2026-11-13.json, the approval record for the
// 2026-11-13 anti-slop copy polish (Fable 5.2 patches, Noa-gated, founder-approved).
// The patch strings are copied byte for byte from the input file; nothing is retyped.
//
//   node scripts/build-copy-polish-approval.mjs <final-patches.json>
//
// For patches against a "key :: value" copy source (the landing .txt files) the record also
// stores `field` plus `oldValue` / `newValue` without the "key :: " prefix, so tests can overlay
// them on earlier approved field values the same way the moment-3 patch is overlaid.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'copy', 'copy-polish-approved-2026-11-13.json');

const input = process.argv[2];
if (!input) { console.error('usage: build-copy-polish-approval.mjs <final-patches.json>'); process.exit(2); }
const patches = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!Array.isArray(patches) || patches.length === 0) throw new Error('expected a non-empty patch array');

const KEYED = /^([A-Za-z][\w.[\]]*) :: /;
const records = patches.map((p, order) => {
  for (const k of ['page', 'file', 'old', 'new']) if (typeof p[k] !== 'string') throw new Error(`patch ${order}: missing ${k}`);
  const ko = p.old.match(KEYED);
  const kn = p.new.match(KEYED);
  const keyed = ko && kn && ko[1] === kn[1];
  return {
    order,
    page: p.page,
    file: p.file,
    set: p.set ?? null,
    idx: p.idx ?? null,
    source: p.source ?? null,
    field: keyed ? ko[1] : null,
    old: p.old,
    new: p.new,
    ...(keyed ? { oldValue: p.old.slice(ko[0].length), newValue: p.new.slice(kn[0].length) } : {}),
  };
});

const record = {
  approval: 'Eitan 2026-11-13, Noa-gated',
  approvedOn: '2026-11-13',
  author: 'Fable 5.2 anti-slop polish; three billing lines rewritten by Tamar (waocopy)',
  gate: 'Noa (language-qa) gated every line; founder read the before/after and approved',
  generatedBy: 'scripts/build-copy-polish-approval.mjs',
  count: records.length,
  patches: records,
};
fs.writeFileSync(OUT, `${JSON.stringify(record, null, 1)}\n`, 'utf8');
console.log(`wrote ${path.relative(ROOT, OUT)}: ${records.length} patches (${records.filter((r) => r.field).length} keyed)`);

#!/usr/bin/env node
// Writes docs/copy/copy-polish-approved-2026-11-13-batch2.json, the approval record for batch 2
// of the 2026-11-13 copy polish: the Noa-gated patch set plus the Yonatan-approved SEO anchors.
// Strings are copied byte for byte from the input files; nothing is retyped.
//
//   node scripts/build-copy-polish-approval-batch2.mjs <batch2-all.json> <anchors-approved.json>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'copy', 'copy-polish-approved-2026-11-13-batch2.json');

const [patchesPath, anchorsPath] = process.argv.slice(2);
if (!patchesPath || !anchorsPath) {
  console.error('usage: build-copy-polish-approval-batch2.mjs <batch2-all.json> <anchors-approved.json>');
  process.exit(2);
}
const patches = JSON.parse(fs.readFileSync(patchesPath, 'utf8'));
const anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));
if (!Array.isArray(patches) || !patches.length) throw new Error('expected a non-empty patch array');
if (!anchors || typeof anchors !== 'object' || Array.isArray(anchors)) throw new Error('expected an anchors object');

// Where each anchor is implemented (engineer's record, for Roni / Noa).
const TARGETS = {
  home_title: 'src/content/astra-homepage-copy.json metadata.seo.homepage_title_tag_current (+ "\\u200f | WAO"; docs/copy mirror kept in sync)',
  about_title: 'src/app/(app)/about/page.tsx metadata.title.absolute and openGraph.title',
  about_badge: 'src/app/(app)/about/page.tsx hero badge',
  about_h1: 'src/app/(app)/about/page.tsx h1 (gradient on the part after the comma)',
  google_ads_h1: 'docs/copy/google-ads-r2-final-candidate-2026-11-12.txt hero.h1 -> regenerated landingCopy.generated.ts',
  onboarding_title: 'src/app/(app)/google-ads/onboarding/layout.tsx metadata.title (robots noindex,follow)',
  onboarding_eyebrow: 'src/app/(app)/google-ads/onboarding/page.tsx eyebrow',
  onboarding_h1: 'src/app/(app)/google-ads/onboarding/page.tsx h1 (gradient on "Google Ads")',
  site_bot_h1: 'docs/copy/site-bot-r2-final-candidate-2026-11-12.txt hero.h1 -> regenerated landingCopy.generated.ts',
  audit_title: 'src/app/(app)/site-bot/audit/layout.tsx metadata.title = SCORECARD_COPY.FORM_TITLE (same string)',
  consulting_h1: 'src/app/(app)/consulting/page.tsx h1 (gradient on the words after the third)',
  consulting_title: 'src/app/(app)/consulting/page.tsx metadata.title and openGraph.title (+ "\\u200F | WAO")',
  about_consulting_link_label: 'src/app/(app)/about/page.tsx secondary link to /consulting',
};

const record = {
  approval: 'Eitan 2026-11-13, Noa-gated; anchors Yonatan-approved',
  approvedOn: '2026-11-13',
  generatedBy: 'scripts/build-copy-polish-approval-batch2.mjs',
  count: patches.length,
  patches: patches.map((p, order) => {
    for (const k of ['file', 'old', 'new']) if (typeof p[k] !== 'string') throw new Error(`patch ${order}: missing ${k}`);
    return { order, page: p.page ?? null, file: p.file, source: p.source ?? null, batch: p.batch ?? null, n: p.n ?? null, old: p.old, new: p.new };
  }),
  anchors: Object.fromEntries(Object.entries(anchors).map(([key, value]) => {
    if (typeof value !== 'string') throw new Error(`anchor ${key}: not a string`);
    return [key, { value, target: TARGETS[key] ?? null }];
  })),
};
const missing = Object.keys(anchors).filter((k) => !TARGETS[k]);
if (missing.length) throw new Error(`no target recorded for anchors: ${missing.join(', ')}`);
fs.writeFileSync(OUT, `${JSON.stringify(record, null, 1)}\n`, 'utf8');
console.log(`wrote ${path.relative(ROOT, OUT)}: ${record.count} patches, ${Object.keys(record.anchors).length} anchors`);

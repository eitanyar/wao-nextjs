// Builds src/lib/site-bot/eligibilityCopy.generated.ts from the waocopy file
// docs/copy/site-bot-eligibility-waitlist-2026-11-25.waocopy.json (Site Bot ads-first launch, build step 1: the eligibility
// block and waiting list on the free-check result). The source is prose plus ONE fenced ```json block; only that block is read.
// HEBREW-SAFETY: this script is ASCII-only and never contains Hebrew. Every value is read, byte-exact, from the source and
// serialized with JSON.stringify. To change the copy: change the source (waocopy), then run
// `node scripts/build-site-bot-eligibility-copy.mjs`. scripts/build-site-bot-eligibility-copy.test.mjs fails if the module drifts.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SOURCE_URL = new URL('../docs/copy/site-bot-eligibility-waitlist-2026-11-25.waocopy.json', import.meta.url);
export const OUTPUT_URL = new URL('../src/lib/site-bot/eligibilityCopy.generated.ts', import.meta.url);

/** The 14 keys the audit-result eligibility block and waiting-list form read, in source order. */
export const ELIGIBILITY_KEYS = [
  'NOT_ELIGIBLE_HAS_SITE', 'NOT_ELIGIBLE_TRADE', 'NOT_ELIGIBLE_PROFILE',
  'WAITLIST_FULL_HEAD', 'WAITLIST_FULL_BODY', 'WAITLIST_PREOPEN_HEAD', 'WAITLIST_PREOPEN_BODY',
  'WAITLIST_NAME_LABEL', 'WAITLIST_PHONE_LABEL', 'WAITLIST_EMAIL_LABEL', 'WAITLIST_SUBMIT', 'WAITLIST_CONSENT',
  'WAITLIST_THANKS', 'WAITLIST_ERROR',
];

/** The single fenced json block of the waocopy file, parsed. Throws unless there is exactly one. */
export function extractJsonBlock(source) {
  const blocks = [...source.matchAll(/^```json\n([\s\S]*?)\n```$/gm)];
  if (blocks.length !== 1) throw new Error(`expected exactly one fenced json block, found ${blocks.length}`);
  return JSON.parse(blocks[0][1]);
}

export function buildModel(source) {
  const json = extractJsonBlock(source);
  const keys = Object.keys(json);
  if (keys.length !== ELIGIBILITY_KEYS.length || ELIGIBILITY_KEYS.some(key => !keys.includes(key))) {
    throw new Error(`source keys differ: ${keys.join(',')}`);
  }
  return Object.fromEntries(ELIGIBILITY_KEYS.map(key => {
    const value = json[key];
    if (typeof value !== 'string' || value === '' || value !== value.trim()) throw new Error(`Bad source value: ${key}`);
    return [key, value];
  }));
}

export function generate(source) {
  return [
    '// AUTO-GENERATED from docs/copy/site-bot-eligibility-waitlist-2026-11-25.waocopy.json (waocopy, 2026-11-25).',
    '// Do not edit by hand; run `node scripts/build-site-bot-eligibility-copy.mjs`.',
    '// scripts/build-site-bot-eligibility-copy.test.mjs checks it byte for byte against the source.',
    '',
    `export const SITE_BOT_ELIGIBILITY_COPY = ${JSON.stringify(buildModel(source), null, 2)} as const;`,
    '',
    'export type SiteBotEligibilityCopyKey = keyof typeof SITE_BOT_ELIGIBILITY_COPY;',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(OUTPUT_URL, generate(fs.readFileSync(SOURCE_URL, 'utf8')), 'utf8');
  console.log('Generated src/lib/site-bot/eligibilityCopy.generated.ts');
}

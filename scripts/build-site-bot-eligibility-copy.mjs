// Builds src/lib/site-bot/eligibilityCopy.generated.ts from the waocopy files of the Site Bot ads-first launch, build step 1
// (the eligibility block and waiting list on the free-check result):
//   docs/copy/site-bot-eligibility-waitlist-2026-11-25.waocopy.json         (the step-1 strings)
//   docs/copy/site-bot-eligibility-waitlist-fixes-2026-11-25.waocopy.json   (field errors + per-cause profile block)
// Each source is prose plus ONE fenced ```json block; only that block is read. A key that a later source repeats is an
// error (no silent override).
// HEBREW-SAFETY: this script is ASCII-only and never contains Hebrew. Every value is read, byte-exact, from the sources and
// serialized with JSON.stringify. To change the copy: change the source (waocopy), then run
// `node scripts/build-site-bot-eligibility-copy.mjs`. scripts/build-site-bot-eligibility-copy.test.mjs fails if the module drifts.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SOURCES = [
  {
    url: new URL('../docs/copy/site-bot-eligibility-waitlist-2026-11-25.waocopy.json', import.meta.url),
    name: 'docs/copy/site-bot-eligibility-waitlist-2026-11-25.waocopy.json',
    keys: [
      'NOT_ELIGIBLE_HAS_SITE', 'NOT_ELIGIBLE_TRADE',
      'WAITLIST_FULL_HEAD', 'WAITLIST_FULL_BODY', 'WAITLIST_PREOPEN_HEAD', 'WAITLIST_PREOPEN_BODY',
      'WAITLIST_NAME_LABEL', 'WAITLIST_PHONE_LABEL', 'WAITLIST_EMAIL_LABEL', 'WAITLIST_SUBMIT', 'WAITLIST_CONSENT',
      'WAITLIST_THANKS', 'WAITLIST_ERROR',
    ],
    // In the source but no longer rendered: the profile block now shows one cause (NOT_ELIGIBLE_PROFILE_CLOSED / _NO_RATINGS).
    dropped: ['NOT_ELIGIBLE_PROFILE'],
  },
  {
    url: new URL('../docs/copy/site-bot-eligibility-waitlist-fixes-2026-11-25.waocopy.json', import.meta.url),
    name: 'docs/copy/site-bot-eligibility-waitlist-fixes-2026-11-25.waocopy.json',
    keys: [
      'WAITLIST_INVALID_NAME', 'WAITLIST_INVALID_PHONE', 'WAITLIST_INVALID_EMAIL',
      'NOT_ELIGIBLE_PROFILE_CLOSED', 'NOT_ELIGIBLE_PROFILE_NO_RATINGS',
    ],
    dropped: [],
  },
];
export const OUTPUT_URL = new URL('../src/lib/site-bot/eligibilityCopy.generated.ts', import.meta.url);

/** Every key the audit-result eligibility block and waiting-list form read, in source order. */
export const ELIGIBILITY_KEYS = SOURCES.flatMap(source => source.keys);

/** The single fenced json block of a waocopy file, parsed. Throws unless there is exactly one. */
export function extractJsonBlock(source) {
  const blocks = [...source.matchAll(/^```json\n([\s\S]*?)\n```$/gm)];
  if (blocks.length !== 1) throw new Error(`expected exactly one fenced json block, found ${blocks.length}`);
  return JSON.parse(blocks[0][1]);
}

/** texts: the raw file contents, one per SOURCES entry, in order. */
export function buildModel(texts) {
  if (!Array.isArray(texts) || texts.length !== SOURCES.length) throw new Error(`expected ${SOURCES.length} sources`);
  const model = {};
  SOURCES.forEach((spec, index) => {
    const json = extractJsonBlock(texts[index]);
    const keys = Object.keys(json);
    const expected = [...spec.keys, ...spec.dropped];
    if (keys.length !== expected.length || expected.some(key => !keys.includes(key))) {
      throw new Error(`${spec.name}: source keys differ: ${keys.join(',')}`);
    }
    for (const key of spec.keys) {
      const value = json[key];
      if (typeof value !== 'string' || value === '' || value !== value.trim()) throw new Error(`Bad source value: ${key}`);
      if (Object.hasOwn(model, key)) throw new Error(`Duplicate key across sources: ${key}`);
      model[key] = value;
    }
  });
  return model;
}

export function readSources() {
  return SOURCES.map(spec => fs.readFileSync(spec.url, 'utf8'));
}

export function generate(texts) {
  return [
    '// AUTO-GENERATED (waocopy, 2026-11-25) from:',
    ...SOURCES.map(spec => `//   ${spec.name}`),
    '// Do not edit by hand; run `node scripts/build-site-bot-eligibility-copy.mjs`.',
    '// scripts/build-site-bot-eligibility-copy.test.mjs checks it byte for byte against the sources.',
    '',
    `export const SITE_BOT_ELIGIBILITY_COPY = ${JSON.stringify(buildModel(texts), null, 2)} as const;`,
    '',
    'export type SiteBotEligibilityCopyKey = keyof typeof SITE_BOT_ELIGIBILITY_COPY;',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(OUTPUT_URL, generate(readSources()), 'utf8');
  console.log('Generated src/lib/site-bot/eligibilityCopy.generated.ts');
}

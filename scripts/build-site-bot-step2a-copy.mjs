// Builds src/lib/site-bot/step2aCopy.generated.ts from the waocopy files of Site Bot step 2a (pre-payment interview
// session): the work-location question and its exit, the 24-hour reminder email, the holding and expired-spot screens.
//   docs/copy/site-bot-step2a-location-reminder-2026-11-25.waocopy.json
//   docs/copy/site-bot-step2a-holding-expired-2026-11-25.waocopy.json
// Each source is prose plus ONE fenced ```json block; only that block is read. A key that a later source repeats is an
// error (no silent override).
// HEBREW-SAFETY: this script is ASCII-only and never contains Hebrew. Every value is read, byte-exact, from the sources and
// serialized with JSON.stringify. To change the copy: change the source (waocopy), then run
// `node scripts/build-site-bot-step2a-copy.mjs`. scripts/build-site-bot-step2a-copy.test.mjs fails if the module drifts.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SOURCES = [
  {
    url: new URL('../docs/copy/site-bot-step2a-location-reminder-2026-11-25.waocopy.json', import.meta.url),
    name: 'docs/copy/site-bot-step2a-location-reminder-2026-11-25.waocopy.json',
    keys: [
      'LOCATION_Q_TUTOR', 'LOCATION_Q_PHOTOGRAPHER', 'LOCATION_Q_SOLAR',
      'LOCATION_OPT_HOME', 'LOCATION_OPT_OWN_PLACE', 'LOCATION_OPT_ONLINE', 'LOCATION_OPT_MIX',
      'LOCATION_EXIT_HEAD', 'LOCATION_EXIT_BODY',
      'REMINDER_SUBJECT', 'REMINDER_BODY', 'REMINDER_CTA',
    ],
    dropped: [],
  },
  {
    url: new URL('../docs/copy/site-bot-step2a-holding-expired-2026-11-25.waocopy.json', import.meta.url),
    name: 'docs/copy/site-bot-step2a-holding-expired-2026-11-25.waocopy.json',
    keys: ['HOLDING_HEAD', 'HOLDING_BODY', 'HOLDING_CTA', 'EXPIRED_HEAD', 'EXPIRED_BODY', 'EXPIRED_CTA'],
    dropped: [],
  },
];
export const OUTPUT_URL = new URL('../src/lib/site-bot/step2aCopy.generated.ts', import.meta.url);

/** Every key step 2a reads, in source order. */
export const STEP2A_KEYS = SOURCES.flatMap(source => source.keys);

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
    '// Do not edit by hand; run `node scripts/build-site-bot-step2a-copy.mjs`.',
    '// scripts/build-site-bot-step2a-copy.test.mjs checks it byte for byte against the sources.',
    '',
    `export const SITE_BOT_STEP2A_COPY = ${JSON.stringify(buildModel(texts), null, 2)} as const;`,
    '',
    'export type SiteBotStep2aCopyKey = keyof typeof SITE_BOT_STEP2A_COPY;',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(OUTPUT_URL, generate(readSources()), 'utf8');
  console.log('Generated src/lib/site-bot/step2aCopy.generated.ts');
}

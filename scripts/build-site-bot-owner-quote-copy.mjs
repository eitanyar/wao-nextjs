// Builds src/lib/site-bot/ownerQuoteCopy.generated.ts from the waocopy files of the Site Bot first-screen owner quote line
// (docs/missions/site-bot-step2-interview-preview-2026-11-25.md, 2c "First-screen fact" (b)):
//   docs/copy/site-bot-owner-quote-frames-2026-11-25.waocopy.json       (the five frames + the name fallback, all keys)
//   docs/copy/site-bot-owner-quote-attribution-2026-11-25.waocopy.json  (OWNER_QUOTE_ARIA_LABEL only; the signature keys
//                                                                         were replaced by the frames and are not read)
// Each source is prose plus ONE fenced ```json block; only that block is read. Its key set must be exactly `keys`; only
// `pick` (default: every key) reaches the module.
// HEBREW-SAFETY: this script is ASCII-only and never contains Hebrew. Every value is read, byte-exact, from the source and
// serialized with JSON.stringify. To change the copy: change the source (waocopy), then run
// `node scripts/build-site-bot-owner-quote-copy.mjs`. scripts/build-site-bot-owner-quote-copy.test.mjs fails if it drifts.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const FRAME_KEYS = ['QUOTE_FRAME_REFUSAL', 'QUOTE_FRAME_JOB', 'QUOTE_FRAME_NUMBER', 'QUOTE_FRAME_CREDENTIAL', 'QUOTE_FRAME_PRICE_RULE'];

export const SOURCES = [
  {
    name: 'docs/copy/site-bot-owner-quote-frames-2026-11-25.waocopy.json',
    keys: [...FRAME_KEYS, 'QUOTE_NAME_FALLBACK'],
  },
  {
    name: 'docs/copy/site-bot-owner-quote-attribution-2026-11-25.waocopy.json',
    keys: ['OWNER_QUOTE_ATTRIBUTION_NAMED', 'OWNER_QUOTE_ATTRIBUTION_ANON', 'OWNER_QUOTE_ARIA_LABEL'],
    pick: ['OWNER_QUOTE_ARIA_LABEL'],
  },
].map(source => ({ ...source, url: new URL(`../${source.name}`, import.meta.url) }));

export const OUTPUT_URL = new URL('../src/lib/site-bot/ownerQuoteCopy.generated.ts', import.meta.url);

/** Every key the module carries, in source order. */
export const OWNER_QUOTE_KEYS = SOURCES.flatMap(source => source.pick ?? source.keys);

/** Each frame carries exactly one {name}; no other key carries a placeholder. */
export const PLACEHOLDERS = Object.fromEntries(FRAME_KEYS.map(key => [key, ['{name}']]));

/** The single fenced json block of a waocopy file, parsed. Throws unless there is exactly one. */
export function extractJsonBlock(source) {
  const blocks = [...source.matchAll(/^```json\n([\s\S]*?)\n```$/gm)];
  if (blocks.length !== 1) throw new Error(`expected exactly one fenced json block, found ${blocks.length}`);
  return JSON.parse(blocks[0][1]);
}

export function buildSourceModel(text, source) {
  const json = extractJsonBlock(text);
  const keys = Object.keys(json);
  if (keys.length !== source.keys.length || source.keys.some(key => !keys.includes(key))) {
    const missing = source.keys.filter(key => !keys.includes(key));
    throw new Error(`${source.name}: source keys differ (missing: ${missing.join(',') || 'none'}; got ${keys.join(',')})`);
  }
  const model = {};
  for (const key of source.pick ?? source.keys) {
    const value = json[key];
    if (typeof value !== 'string' || value === '' || value !== value.trim()) throw new Error(`Bad source value: ${key}`);
    const found = value.match(/\{[A-Za-z]+\}/g) ?? [];
    const expected = PLACEHOLDERS[key] ?? [];
    if (found.length !== expected.length || expected.some(item => !found.includes(item))) {
      throw new Error(`${key}: placeholders differ (expected ${expected.join(',') || 'none'}; got ${found.join(',') || 'none'})`);
    }
    // The frames end in their own colon (waocopy note): the renderer never adds one.
    if (FRAME_KEYS.includes(key) && !value.endsWith(':')) throw new Error(`${key}: a frame ends in a colon`);
    model[key] = value;
  }
  return model;
}

export function buildModel(texts) {
  if (!Array.isArray(texts) || texts.length !== SOURCES.length) throw new Error(`expected ${SOURCES.length} source texts`);
  const model = {};
  SOURCES.forEach((source, index) => {
    for (const [key, value] of Object.entries(buildSourceModel(texts[index], source))) {
      if (key in model) throw new Error(`duplicate key across sources: ${key}`);
      model[key] = value;
    }
  });
  return model;
}

export function readSources() {
  return SOURCES.map(source => fs.readFileSync(source.url, 'utf8'));
}

export function generate(texts) {
  return [
    '// AUTO-GENERATED (waocopy, 2026-11-25) from:',
    ...SOURCES.map(source => `//   ${source.name}${source.pick ? ` (only ${source.pick.join(', ')})` : ''}`),
    '// Do not edit by hand; run `node scripts/build-site-bot-owner-quote-copy.mjs`.',
    '// scripts/build-site-bot-owner-quote-copy.test.mjs checks it byte for byte against the source.',
    '',
    `export const SITE_BOT_OWNER_QUOTE_COPY = ${JSON.stringify(buildModel(texts), null, 2)} as const;`,
    '',
    'export type SiteBotOwnerQuoteCopyKey = keyof typeof SITE_BOT_OWNER_QUOTE_COPY;',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(OUTPUT_URL, generate(readSources()), 'utf8');
  console.log('Generated src/lib/site-bot/ownerQuoteCopy.generated.ts');
}

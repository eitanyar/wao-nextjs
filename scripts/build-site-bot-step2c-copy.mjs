// Builds src/lib/site-bot/step2cCopy.generated.ts from the waocopy files of Site Bot step 2c (home-page preview and the
// handoff to payment): the generating screen and its ready email, the preview screen, the fix round, the after-payment
// list, the pay button, the failure text; plus the 2b carry-over FACTS_EMPTY_FINAL (no facts after the one return).
//   docs/copy/site-bot-step2c-preview-pay-2026-11-25.waocopy.json
//   docs/copy/site-bot-step2b-facts-empty-final-2026-11-25.waocopy.json
// Each source is prose plus ONE fenced ```json block; only that block is read. Its key set must be exactly its SOURCES keys.
// Prices are never typed into the copy (plans.test.ts "one config source"): the Site Bot monthly price (199) in PAY_CTA_SUB
// is replaced by the `{net}` token here, with an asserted count, and filled back at runtime from src/lib/payments/plans.ts
// (step2cCopy.ts payCtaSub). The drift test proves the filled value equals the source byte for byte.
// HEBREW-SAFETY: this script is ASCII-only and never contains Hebrew. Every value is read, byte-exact, from the source and
// serialized with JSON.stringify. To change the copy: change the source (waocopy), then run
// `node scripts/build-site-bot-step2c-copy.mjs`. scripts/build-site-bot-step2c-copy.test.mjs fails if the module drifts.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The waocopy sources, in order; each one's fenced json block must carry exactly its `keys`. */
export const SOURCES = [
  {
    name: 'docs/copy/site-bot-step2c-preview-pay-2026-11-25.waocopy.json',
    keys: [
      'GENERATING_HEAD', 'GENERATING_BODY',
      'GENERATING_EMAIL_SUBJECT', 'GENERATING_EMAIL_BODY', 'GENERATING_EMAIL_CTA',
      'PREVIEW_HEAD', 'PREVIEW_BODY', 'PREVIEW_FRAME_LABEL',
      'PREVIEW_FIX_LINK', 'PREVIEW_FIX_USED',
      'PREVIEW_NEXT_HEAD', 'PREVIEW_NEXT_LIST',
      'PAY_CTA', 'PAY_CTA_SUB',
      'PREVIEW_FAILED',
    ],
  },
  {
    name: 'docs/copy/site-bot-step2b-facts-empty-final-2026-11-25.waocopy.json',
    keys: ['FACTS_EMPTY_FINAL'],
  },
].map(source => ({ ...source, url: new URL(`../${source.name}`, import.meta.url) }));

export const OUTPUT_URL = new URL('../src/lib/site-bot/step2cCopy.generated.ts', import.meta.url);

/** Every key step 2c reads, in source order. */
export const STEP2C_KEYS = SOURCES.flatMap(source => source.keys);

/** The placeholders each templated key must carry (and the only keys that may carry one). */
export const PLACEHOLDERS = {
  GENERATING_EMAIL_SUBJECT: ['{businessName}'],
  GENERATING_EMAIL_BODY: ['{businessName}', '{previewUrl}'],
};

export const NET_TOKEN = '{net}';
export const PRICE = '199';
/** The keys whose source carries the price, and how many times each. */
export const PRICE_KEYS = { PAY_CTA_SUB: 1 };
const priceRegex = () => new RegExp(`(?<![\\d.,])${PRICE}(?![\\d.,])`, 'g');

/** The source value with the price replaced by NET_TOKEN (asserted count per key; any other key must not quote it). */
export function tokenizePrice(key, value) {
  let count = 0;
  const out = value.replace(priceRegex(), () => { count += 1; return NET_TOKEN; });
  if (count !== (PRICE_KEYS[key] ?? 0)) throw new Error(`${key}: expected ${PRICE_KEYS[key] ?? 0} price tokens, found ${count}`);
  return out;
}

/** The single fenced json block of a waocopy file, parsed. Throws unless there is exactly one. */
export function extractJsonBlock(source) {
  const blocks = [...source.matchAll(/^```json\n([\s\S]*?)\n```$/gm)];
  if (blocks.length !== 1) throw new Error(`expected exactly one fenced json block, found ${blocks.length}`);
  return JSON.parse(blocks[0][1]);
}

/** text: the raw contents of one source file; source: its SOURCES entry. */
export function buildSourceModel(text, source) {
  const json = extractJsonBlock(text);
  const keys = Object.keys(json);
  if (keys.length !== source.keys.length || source.keys.some(key => !keys.includes(key))) {
    const missing = source.keys.filter(key => !keys.includes(key));
    throw new Error(`${source.name}: source keys differ (missing: ${missing.join(',') || 'none'}; got ${keys.join(',')})`);
  }
  const model = {};
  for (const key of source.keys) {
    const value = json[key];
    if (typeof value !== 'string' || value === '' || value !== value.trim()) throw new Error(`Bad source value: ${key}`);
    const found = value.match(/\{[A-Za-z]+\}/g) ?? [];
    const expected = PLACEHOLDERS[key] ?? [];
    if (expected.some(item => !found.includes(item)) || found.some(item => !expected.includes(item))) {
      throw new Error(`${key}: placeholders differ (expected ${expected.join(',') || 'none'}; got ${found.join(',') || 'none'})`);
    }
    model[key] = tokenizePrice(key, value);
  }
  return model;
}

/** texts: the raw contents of every source file, in SOURCES order. */
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
    ...SOURCES.map(source => `//   ${source.name}`),
    '// Do not edit by hand; run `node scripts/build-site-bot-step2c-copy.mjs`.',
    '// scripts/build-site-bot-step2c-copy.test.mjs checks it byte for byte against the source.',
    `// The Site Bot price is the ${NET_TOKEN} token, filled from src/lib/payments/plans.ts (step2cCopy.ts payCtaSub).`,
    '',
    `export const SITE_BOT_STEP2C_COPY = ${JSON.stringify(buildModel(texts), null, 2)} as const;`,
    '',
    'export type SiteBotStep2cCopyKey = keyof typeof SITE_BOT_STEP2C_COPY;',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(OUTPUT_URL, generate(readSources()), 'utf8');
  console.log('Generated src/lib/site-bot/step2cCopy.generated.ts');
}

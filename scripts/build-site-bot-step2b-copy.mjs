// Builds src/lib/site-bot/step2bCopy.generated.ts from the waocopy file of Site Bot step 2b (interview v1 and facts):
// the five interview questions and their hints, the price chips, the vague-answer probe, the question buttons, the gates
// intro, the confirm-facts screen and its fact-type labels, the session-elsewhere screen, the start-page footer and the
// shared continue label; plus the confirm-facts a11y keys (fix Cancel, per-fact status texts).
//   docs/copy/site-bot-step2b-interview-facts-2026-11-25.waocopy.json
//   docs/copy/site-bot-step2b-facts-a11y-keys-2026-11-25.waocopy.json
// Each source is prose plus ONE fenced ```json block; only that block is read. Its key set must be exactly its SOURCES keys.
// HEBREW-SAFETY: this script is ASCII-only and never contains Hebrew. Every value is read, byte-exact, from the source and
// serialized with JSON.stringify. To change the copy: change the source (waocopy), then run
// `node scripts/build-site-bot-step2b-copy.mjs`. scripts/build-site-bot-step2b-copy.test.mjs fails if the module drifts.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The waocopy sources, in order; each one's fenced json block must carry exactly its `keys`. */
export const SOURCES = [
  {
    name: 'docs/copy/site-bot-step2b-interview-facts-2026-11-25.waocopy.json',
    keys: [
      'Q_INTRO',
      'Q_RECENT_JOB', 'Q_RECENT_JOB_HINT',
      'Q_TURNED_DOWN', 'Q_TURNED_DOWN_HINT',
      'Q_CALLER_QUESTION', 'Q_CALLER_QUESTION_HINT',
      'Q_PRICE_STYLE', 'Q_PRICE_STYLE_HINT',
      'PRICE_CHIP_PHONE_ESTIMATE', 'PRICE_CHIP_AFTER_VISIT', 'PRICE_CHIP_FIXED_LIST', 'PRICE_CHIP_FREE_VISIT', 'PRICE_CHIP_PAID_VISIT',
      'Q_AREA_PATTERN', 'Q_AREA_PATTERN_HINT',
      'PROBE_GENERIC',
      'Q_SKIP', 'Q_NEXT', 'Q_SUBMIT_LAST',
      'GATES_INTRO',
      'FACTS_HEAD', 'FACTS_BODY', 'FACT_CONFIRM', 'FACT_FIX', 'FACT_REMOVE', 'FACT_FIX_SAVE', 'FACTS_DONE', 'FACTS_EMPTY',
      'FACT_TYPE_JOB', 'FACT_TYPE_REFUSAL', 'FACT_TYPE_PRICE_RULE', 'FACT_TYPE_LOCAL', 'FACT_TYPE_TOOL', 'FACT_TYPE_NUMBER', 'FACT_TYPE_CREDENTIAL',
      'SESSION_ELSEWHERE_HEAD', 'SESSION_ELSEWHERE_BODY',
      'START_FOOTER_NOTE',
      'STEP_CONTINUE',
    ],
  },
  {
    // Maya's a11y audit of the confirm-facts screen: the fix field's Cancel and the per-fact role="status" texts.
    // The status values carry niqqud (qamats + dagesh): read byte-exact like every other value.
    name: 'docs/copy/site-bot-step2b-facts-a11y-keys-2026-11-25.waocopy.json',
    keys: ['FACT_FIX_CANCEL', 'FACT_STATUS_CONFIRMED', 'FACT_STATUS_EDITED', 'FACT_STATUS_REMOVED'],
  },
].map(source => ({ ...source, url: new URL(`../${source.name}`, import.meta.url) }));

export const OUTPUT_URL = new URL('../src/lib/site-bot/step2bCopy.generated.ts', import.meta.url);

/** Every key step 2b reads, in source order. */
export const STEP2B_KEYS = SOURCES.flatMap(source => source.keys);

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
    model[key] = value;
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
    '// Do not edit by hand; run `node scripts/build-site-bot-step2b-copy.mjs`.',
    '// scripts/build-site-bot-step2b-copy.test.mjs checks it byte for byte against the source.',
    '',
    `export const SITE_BOT_STEP2B_COPY = ${JSON.stringify(buildModel(texts), null, 2)} as const;`,
    '',
    'export type SiteBotStep2bCopyKey = keyof typeof SITE_BOT_STEP2B_COPY;',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(OUTPUT_URL, generate(readSources()), 'utf8');
  console.log('Generated src/lib/site-bot/step2bCopy.generated.ts');
}

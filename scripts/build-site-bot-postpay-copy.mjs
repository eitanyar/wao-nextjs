// Builds src/lib/site-bot/postPayCopy.generated.ts from the approved waocopy file
// docs/copy/site-bot-postpay-FINAL-2026-11-20.json (post-payment screen of the Site Bot pay page, Fable 5.2 report rows 1-8).
// HEBREW-SAFETY: this script is ASCII-only and never contains Hebrew. Every value is read, byte-exact, from the source JSON
// and serialized with JSON.stringify. To change the copy: change the JSON (waocopy), then run
// `node scripts/build-site-bot-postpay-copy.mjs`. scripts/build-site-bot-postpay-copy.test.mjs fails if the module drifts.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SOURCE_URL = new URL('../docs/copy/site-bot-postpay-FINAL-2026-11-20.json', import.meta.url);
export const OUTPUT_URL = new URL('../src/lib/site-bot/postPayCopy.generated.ts', import.meta.url);

/** The 16 keys the pay page reads, in source order (pay_error_unknown added 2026-11-20). */
export const POSTPAY_KEYS = [
  'intro', 'gate_business_boundary', 'gate_service_attributes', 'gate_geography', 'gate_money_services', 'send', 'sending',
  'answer_error', 'done_paid', 'done_next_own_domain', 'done_next_no_domain', 'done_answers_saved', 'pay_error_not_charged',
  'pay_error_after_charge', 'charging', 'pay_error_unknown',
];

export function buildModel(source) {
  const json = JSON.parse(source);
  const keys = Object.keys(json);
  if (keys.length !== POSTPAY_KEYS.length || POSTPAY_KEYS.some(key => !keys.includes(key))) throw new Error(`source keys differ: ${keys.join(',')}`);
  return Object.fromEntries(POSTPAY_KEYS.map(key => {
    const value = json[key];
    if (typeof value !== 'string' || value === '' || value !== value.trim()) throw new Error(`Bad source value: ${key}`);
    return [key, value];
  }));
}

export function generate(source) {
  return [
    '// AUTO-GENERATED from docs/copy/site-bot-postpay-FINAL-2026-11-20.json (waocopy, 2026-11-20).',
    '// Do not edit by hand; run `node scripts/build-site-bot-postpay-copy.mjs`. scripts/build-site-bot-postpay-copy.test.mjs',
    '// checks it byte for byte against the source.',
    '',
    `export const SITE_BOT_POSTPAY_COPY = ${JSON.stringify(buildModel(source), null, 2)} as const;`,
    '',
    'export type SiteBotPostPayCopyKey = keyof typeof SITE_BOT_POSTPAY_COPY;',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(OUTPUT_URL, generate(fs.readFileSync(SOURCE_URL, 'utf8')), 'utf8');
  console.log('Generated src/lib/site-bot/postPayCopy.generated.ts');
}

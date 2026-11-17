// Builds src/lib/showcase/consentCopy.generated.ts from the approved legal source
// docs/legal/showcase-consent-legal-FINAL-2026-11-17.json (Eitan 2026-11-17; Adam as counsel; waocopy + Noa).
// HEBREW-SAFETY: this script is ASCII-only and never contains Hebrew. Every value is read, byte-exact, from the
// source JSON and serialized with JSON.stringify. The clause digests are sha256 over the exact clause text.
//
// To change the copy: change the JSON (Tamar -> Noa -> counsel), bump SHOWCASE_CONSENT_TEXT_VERSION below if the
// meaning changed, then run `node scripts/build-showcase-consent-copy.mjs`. The test fails if the module drifts.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const SOURCE_URL = new URL('../docs/legal/showcase-consent-legal-FINAL-2026-11-17.json', import.meta.url);
export const OUTPUT_URL = new URL('../src/lib/showcase/consentCopy.generated.ts', import.meta.url);
/** The approved text set. A consent record stores this plus the digest of the exact clause the owner agreed to. */
export const SHOWCASE_CONSENT_TEXT_VERSION = 'showcase-consent-2026-11-17';

/** The exact clause text a product's consent refers to: the terms sub-clause title, a blank line, then its body. */
export function clauseText(clause) {
  if (typeof clause?.title !== 'string' || typeof clause?.body !== 'string' || !clause.title || !clause.body) {
    throw new Error('clause needs a title and a body');
  }
  return `${clause.title}\n\n${clause.body}`;
}

export const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');

function str(value, name) {
  if (typeof value !== 'string' || value === '' || value !== value.trim()) throw new Error(`Bad source value: ${name}`);
  return value;
}

export function buildModel(source) {
  const json = JSON.parse(source);
  const product = (key, clauseKey) => ({
    checkboxLabel: str(json[key]?.checkboxLabel, `${key}.checkboxLabel`),
    checkboxHelp: str(json[key]?.checkboxHelp, `${key}.checkboxHelp`),
    clauseTitle: str(json[clauseKey]?.title, `${clauseKey}.title`),
    clauseBody: str(json[clauseKey]?.body, `${clauseKey}.body`),
    clauseSha256: sha256(clauseText(json[clauseKey])),
  });
  return {
    textVersion: SHOWCASE_CONSENT_TEXT_VERSION,
    products: { 'site-bot': product('siteBot', 'termsClause'), 'ads-bot': product('adsBot', 'adsBotTermsClause') },
    privacyPolicySentence: str(json.privacyPolicySentence, 'privacyPolicySentence'),
    accountToggle: {
      label: str(json.accountToggle?.label, 'accountToggle.label'),
      onState: str(json.accountToggle?.onState, 'accountToggle.onState'),
      offState: str(json.accountToggle?.offState, 'accountToggle.offState'),
      afterOffNotice: str(json.accountToggle?.afterOffNotice, 'accountToggle.afterOffNotice'),
    },
  };
}

export function generate(source) {
  const model = buildModel(source);
  return [
    '// AUTO-GENERATED from docs/legal/showcase-consent-legal-FINAL-2026-11-17.json (approved legal text, 2026-11-17).',
    '// Do not edit by hand; run `node scripts/build-showcase-consent-copy.mjs`. scripts/build-showcase-consent-copy.test.mjs',
    '// checks it byte for byte against the source.',
    '',
    `export const SHOWCASE_CONSENT_COPY = ${JSON.stringify(model, null, 2)} as const;`,
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(new URL('.', OUTPUT_URL), { recursive: true });
  fs.writeFileSync(OUTPUT_URL, generate(fs.readFileSync(SOURCE_URL, 'utf8')), 'utf8');
  console.log('Generated src/lib/showcase/consentCopy.generated.ts');
}

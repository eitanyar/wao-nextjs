// Builds src/lib/legal/adsBotTermsDoc.ts from the approved legal source docs/legal/ads-bot-terms-of-use.md, with the
// Site-Bot terms generator (scripts/build-site-bot-terms.mjs: same markdown dialect, same parser, same round trip).
// HEBREW-SAFETY: this script is ASCII-only and never contains Hebrew. Every rendered string is sliced, byte-exact, out of
// the pinned source file.
// The pin is NOT defined here: it is ADS_BOT_TERMS_SHA256 in src/lib/google-ads/billing/adsBotTerms.ts (the checkout
// consent version pin), read from that file, so the terms page and the recorded consent version can never disagree.
// To change the terms: edit the md (waocopy -> lawyer), bump ADS_BOT_TERMS_SHA256 + ADS_BOT_TERMS_VERSION, run
// `node scripts/build-ads-bot-terms.mjs`.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateLegalModule } from './build-site-bot-terms.mjs';

export const SOURCE_URL = new URL('../docs/legal/ads-bot-terms-of-use.md', import.meta.url);
export const OUTPUT_URL = new URL('../src/lib/legal/adsBotTermsDoc.ts', import.meta.url);
export const PIN_URL = new URL('../src/lib/google-ads/billing/adsBotTerms.ts', import.meta.url);

/** ADS_BOT_TERMS_SHA256 as written in adsBotTerms.ts (exactly one 64-hex literal). */
export function pinnedSha256(pinSource = fs.readFileSync(PIN_URL, 'utf8')) {
  const matches = [...pinSource.matchAll(/export const ADS_BOT_TERMS_SHA256 = '([0-9a-f]{64})';/g)];
  if (matches.length !== 1) throw new Error('ADS_BOT_TERMS_SHA256 not found exactly once in adsBotTerms.ts');
  return matches[0][1];
}

export function generateAdsBotTerms(source, sha256 = pinnedSha256()) {
  return generateLegalModule({
    source,
    sha256,
    sourceRel: 'docs/legal/ads-bot-terms-of-use.md',
    scriptRel: 'scripts/build-ads-bot-terms.mjs',
    testRel: 'scripts/build-ads-bot-terms.test.mjs',
    exportName: 'ADS_BOT_TERMS',
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(OUTPUT_URL, generateAdsBotTerms(fs.readFileSync(SOURCE_URL, 'utf8')), 'utf8');
  console.log('Generated src/lib/legal/adsBotTermsDoc.ts');
}

// Footer: the Google third-party (agency) disclosure link on every wao.co.il page.
// HEBREW-SAFETY: zero Hebrew bytes; the label is read from the approved waocopy file.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (relative) => fs.readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8');

test('footer carries the byte-exact disclosure label, the Google URL, a new tab and rel=noopener, bidi via renderMixed', () => {
  const raw = read('docs/copy/gbp-third-party-disclosure-2026-11-24.waocopy.json');
  const { footerLabel } = JSON.parse(raw.match(/```json\n([\s\S]*?)\n```/)[1]);
  const src = read('src/components/Footer.tsx');
  assert.ok(src.includes(`const GBP_AGENCY_POLICY_LABEL = ${JSON.stringify(footerLabel)};`));
  assert.ok(src.includes('const GBP_AGENCY_POLICY_URL = "https://support.google.com/business/answer/7163406?hl=iw";'));
  const anchor = src.slice(src.indexOf('href={GBP_AGENCY_POLICY_URL}') - 20, src.indexOf('{renderMixed(GBP_AGENCY_POLICY_LABEL)}'));
  assert.match(anchor, /target="_blank"/);
  assert.match(anchor, /rel="noopener"/);
  // The bottom-bar link row wraps at narrow widths (390px) instead of overflowing.
  assert.ok(src.includes('display: "flex", flexWrap: "wrap", gap: "4px 24px"'));
});

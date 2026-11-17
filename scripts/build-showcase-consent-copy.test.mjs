// HEBREW-SAFETY: zero Hebrew bytes. Every expectation is derived from the source JSON at run time.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { SOURCE_URL, OUTPUT_URL, SHOWCASE_CONSENT_TEXT_VERSION, clauseText, generate, sha256 } from './build-showcase-consent-copy.mjs';

const sourceText = fs.readFileSync(SOURCE_URL, 'utf8');
const source = JSON.parse(sourceText);

function loadGenerated() {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(OUTPUT_URL, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(js, { exports });
  return JSON.parse(JSON.stringify(exports.SHOWCASE_CONSENT_COPY));
}

test('the committed module is exactly the generated one, and the generator is ASCII-only', () => {
  assert.equal(fs.readFileSync(OUTPUT_URL, 'utf8'), generate(sourceText));
  assert.ok([...fs.readFileSync(new URL('./build-showcase-consent-copy.mjs', import.meta.url), 'utf8')].every(c => c.codePointAt(0) < 128));
});

test('every value equals the source JSON byte for byte', () => {
  const copy = loadGenerated();
  assert.equal(copy.textVersion, SHOWCASE_CONSENT_TEXT_VERSION);
  for (const [product, key, clauseKey] of [['site-bot', 'siteBot', 'termsClause'], ['ads-bot', 'adsBot', 'adsBotTermsClause']]) {
    const p = copy.products[product];
    assert.equal(p.checkboxLabel, source[key].checkboxLabel);
    assert.equal(p.checkboxHelp, source[key].checkboxHelp);
    assert.equal(p.clauseTitle, source[clauseKey].title);
    assert.equal(p.clauseBody, source[clauseKey].body);
  }
  assert.equal(copy.privacyPolicySentence, source.privacyPolicySentence);
  assert.deepEqual(copy.accountToggle, source.accountToggle);
});

test('clause digests are stable sha256 over "title\\n\\nbody" and differ per product', () => {
  const copy = loadGenerated();
  assert.equal(copy.products['site-bot'].clauseSha256, sha256(`${source.termsClause.title}\n\n${source.termsClause.body}`));
  assert.equal(copy.products['ads-bot'].clauseSha256, sha256(clauseText(source.adsBotTermsClause)));
  assert.match(copy.products['site-bot'].clauseSha256, /^[0-9a-f]{64}$/);
  assert.notEqual(copy.products['site-bot'].clauseSha256, copy.products['ads-bot'].clauseSha256);
  // Recomputing twice gives the same digest (no salt, no timestamp).
  assert.equal(generate(sourceText), generate(sourceText));
});

// Terms placement (_meta.placement): Site Bot + Ads Bot section 10, a bold title paragraph right after the
// "results data for marketing" paragraph, then the body; exactly once. The marketing lead is read from the clause's
// own back-reference (the quoted paragraph name), never typed here.
const md = rel => fs.readFileSync(new URL(`../docs/legal/${rel}`, import.meta.url), 'utf8');
const marketingLead = (() => {
  const m = source.termsClause.body.match(/\u05F4([^\u05F4]+)\u05F4/); // the first gershayim-quoted name
  assert.ok(m, 'clause quotes the marketing paragraph');
  return `**${m[1]}** \u2014 `;
})();

for (const [file, clauseKey] of [['site-bot-terms-of-use.md', 'termsClause'], ['ads-bot-terms-of-use.md', 'adsBotTermsClause']]) {
  test(`${file}: the showcase clause sits once in section 10, right after the marketing paragraph`, () => {
    const text = md(file);
    const clause = source[clauseKey];
    const block = `**${clause.title}**\n\n${clause.body}`;
    assert.equal(text.split(block).length - 1, 1, 'exactly once');
    assert.equal(text.split(`**${clause.title}**`).length - 1, 1, 'title once');
    const s10 = text.indexOf('\n### 10. ');
    const s11 = text.indexOf('\n### 11. ');
    const at = text.indexOf(block);
    assert.ok(s10 > 0 && s10 < at && at < s11, 'inside section 10');
    const lead = text.indexOf(marketingLead, s10);
    assert.ok(lead > s10 && lead < at, 'marketing paragraph precedes it');
    const leadEnd = text.indexOf('\n', lead);
    assert.equal(text.slice(leadEnd, at), '\n\n', 'immediately after it, one blank line');
  });
}

test('privacy policy: the showcase sentence sits once in section 3', () => {
  const text = md('privacy-policy.md');
  assert.equal(text.split(source.privacyPolicySentence).length - 1, 1);
  const at = text.indexOf(source.privacyPolicySentence);
  assert.ok(text.indexOf('\n### 3. ') < at && at < text.indexOf('\n### 4. '));
});

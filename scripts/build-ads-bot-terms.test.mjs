// HEBREW-SAFETY: zero Hebrew bytes. Every expectation is derived from the md source at run time.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { legalSourceDigest, parseTerms, serializeTerms } from './build-site-bot-terms.mjs';
import { OUTPUT_URL, PIN_URL, SOURCE_URL, generateAdsBotTerms, pinnedSha256 } from './build-ads-bot-terms.mjs';

const source = fs.readFileSync(SOURCE_URL, 'utf8');
const textOf = inlines => inlines.map(s => s.text).join('');

function loadGenerated() {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(OUTPUT_URL, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(js, { exports, require: () => ({}) });
  return JSON.parse(JSON.stringify(exports.ADS_BOT_TERMS));
}

test('pinned source (the checkout consent pin in adsBotTerms.ts) round-trips and the committed module is exactly the generated one', () => {
  const pin = pinnedSha256();
  assert.equal(legalSourceDigest(source), pin);
  assert.match(fs.readFileSync(PIN_URL, 'utf8'), new RegExp(`ADS_BOT_TERMS_VERSION = 'ads-bot-terms-[0-9-]+-${pin.slice(0, 8)}'`));
  assert.equal(serializeTerms(parseTerms(source)), source);
  assert.equal(fs.readFileSync(OUTPUT_URL, 'utf8'), generateAdsBotTerms(source));
  assert.ok([...fs.readFileSync(new URL('./build-ads-bot-terms.mjs', import.meta.url), 'utf8')].every(c => c.codePointAt(0) < 128));
  assert.doesNotMatch(fs.readFileSync(new URL('./build-ads-bot-terms.mjs', import.meta.url), 'utf8'), /[0-9a-f]{64}/, 'no second copy of the pin');
});

test('emitted text equals the source, line by line (independent line-oriented extraction)', () => {
  const doc = loadGenerated();
  const lines = source.split('\n');
  assert.equal(doc.title, lines[0].replace(/^# /, ''));
  assert.deepEqual(doc.sections.map(s => s.heading), lines.filter(l => l.startsWith('### ')).map(l => l.slice(4)));
  assert.equal(doc.sections.length, 20);
  assert.deepEqual(doc.sections.map(s => s.id), doc.sections.map((_, i) => `section-${i + 1}`));
  const emitted = [];
  const blocks = [...doc.intro, ...doc.sections.flatMap(s => [{ type: 'h', text: s.heading }, ...s.blocks])];
  for (const b of blocks) {
    if (b.type === 'h') emitted.push(b.text);
    else if (b.type === 'p') emitted.push(textOf(b.inlines));
    else if (b.type === 'ul') emitted.push(...b.items.map(textOf));
    else emitted.push(b.header.map(textOf).join('|'), ...b.rows.map(r => r.map(textOf).join('|')));
  }
  const expected = lines.slice(1).filter(l => l !== '' && !/^\|(---\|)+$/.test(l)).map(l => {
    if (l.startsWith('### ')) return l.slice(4);
    if (l.startsWith('- ')) return l.slice(2).replaceAll('**', '');
    if (l.startsWith('| ')) return l.slice(2, -2).split(' | ').join('|').replaceAll('**', '');
    return l.replaceAll('**', '');
  });
  assert.deepEqual(emitted, expected);
  assert.equal(doc.sections.flatMap(s => s.blocks).filter(b => b.type === 'table').length, 2);
  assert.ok(doc.sections.flatMap(s => s.blocks).some(b => b.type === 'ul'), 'bullet lists parsed');
  assert.ok(JSON.stringify(doc).includes('"bold":true'), 'bold runs parsed');
});

test('a changed source or a wrong pin fails closed', () => {
  assert.throws(() => generateAdsBotTerms(source + '\n'), /digest changed/);
  assert.throws(() => generateAdsBotTerms(source, '0'.repeat(64)), /digest changed/);
  assert.throws(() => pinnedSha256("export const ADS_BOT_TERMS_SHA256 = 'x';"), /exactly once/);
});

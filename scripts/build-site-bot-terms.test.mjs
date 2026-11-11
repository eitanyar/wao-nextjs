// HEBREW-SAFETY: zero Hebrew bytes. Every expectation is derived from the md source at run time.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { SOURCE_URL, OUTPUT_URL, SOURCE_SHA256, parseTerms, serializeTerms, generateTerms } from './build-site-bot-terms.mjs';

const source = fs.readFileSync(SOURCE_URL, 'utf8');
const textOf = inlines => inlines.map(s => s.text).join('');

function loadGenerated() {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(OUTPUT_URL, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(js, { exports, require: () => ({}) });
  return JSON.parse(JSON.stringify(exports.SITE_BOT_TERMS));
}

test('pinned source round-trips byte for byte and the committed module is exactly the generated one', () => {
  assert.equal(createHash('sha256').update(source).digest('hex'), SOURCE_SHA256);
  assert.equal(serializeTerms(parseTerms(source)), source);
  assert.equal(fs.readFileSync(OUTPUT_URL, 'utf8'), generateTerms(source));
  assert.ok([...fs.readFileSync(new URL('./build-site-bot-terms.mjs', import.meta.url), 'utf8')].every(c => c.codePointAt(0) < 128));
});

test('emitted text equals the source, line by line (independent line-oriented extraction)', () => {
  const doc = loadGenerated();
  const lines = source.split('\n');
  assert.equal(doc.title, lines[0].replace(/^# /, ''));
  // Every heading, in order.
  assert.deepEqual(doc.sections.map(s => s.heading), lines.filter(l => l.startsWith('### ')).map(l => l.slice(4)));
  assert.equal(doc.sections.length, 20);
  assert.deepEqual(doc.sections.map(s => s.id), doc.sections.map((_, i) => `section-${i + 1}`));
  // Every body line, in order, with the markdown syntax stripped.
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
});

test('unexpected markup or a changed source fails closed', () => {
  assert.throws(() => generateTerms(source + '\n'), /digest changed/);
  assert.throws(() => parseTerms(source.replace('### 2.', '### Two.')), /must start with/);
  assert.throws(() => parseTerms(source + '\n**x'), /Unbalanced/);
  assert.throws(() => parseTerms(source + '\n## sub'), /Unsupported block/);
  assert.throws(() => parseTerms(source + '\n1. item'), /Unsupported block/);
  assert.throws(() => parseTerms(source + '\n[a](b)'), /Unsupported inline/);
  assert.throws(() => parseTerms(source + '\n### 3. dup'), /Duplicate/);
});

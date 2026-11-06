import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { SOURCE_URL, OUTPUT_URL, SOURCE_SHA256, IDS, parseCopy, generateCopy } from './build-audit-journey-copy.mjs';
import { createHash } from 'node:crypto';

const source = fs.readFileSync(SOURCE_URL, 'utf8');
test('pinned source extracts every named quote byte-for-byte and actual generated module agrees', () => {
  assert.equal(createHash('sha256').update(source).digest('hex'), SOURCE_SHA256);
  assert.equal(IDS.length, 19);
  const parsed = parseCopy(source);
  // Independent line-oriented extraction, not the production section parser.
  const expected = {};
  let id;
  for (const line of source.split('\n')) {
    if (line.startsWith('### ')) id = line.slice(4).split(' ')[0];
    if (IDS.includes(id) && line.startsWith('>')) (expected[id] ??= []).push(line.slice(line.startsWith('> ') ? 2 : 1));
  }
  assert.deepEqual(parsed, Object.fromEntries(IDS.map(id => [id, expected[id].join('\n')])));
  const generated = fs.readFileSync(OUTPUT_URL, 'utf8');
  assert.equal(generated, generateCopy(source));
  const exports = {};
  vm.runInNewContext(ts.transpileModule(generated, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
  assert.deepEqual(JSON.parse(JSON.stringify(exports.AUDIT_JOURNEY_COPY)), parsed);
  assert.ok([...fs.readFileSync(new URL('./build-audit-journey-copy.mjs', import.meta.url), 'utf8')].every(c => c.codePointAt(0) < 128));
});
test('changed digest, missing or duplicate headings and empty quotes fail closed without writes', () => {
  assert.throws(() => generateCopy(source + '\n'), /digest changed/);
  for (const id of IDS) {
    assert.throws(() => parseCopy(source.replace(`### ${id}`, `### REMOVED_${id}`)), /Missing/);
    assert.throws(() => parseCopy(source + `\n### ${id}\n> Synthetic\n`), /duplicate/);
    const start = source.indexOf(`### ${id}`);
    const end = source.indexOf('\n### ', start + 1);
    const section = source.slice(start, end < 0 ? source.length : end);
    const empty = section.split('\n').filter(line => !line.startsWith('>')).join('\n');
    assert.throws(() => parseCopy(source.replace(section, empty)), /Empty quote/);
  }
});
test('parser removes only quote prefixes and preserves internal spacing and blank quoted lines', () => {
  const synthetic = IDS.map(id => `### ${id} (metadata)\nTrigger\n\n>  two spaces  \n>\n> third\n`).join('\n');
  for (const value of Object.values(parseCopy(synthetic))) assert.equal(value, ' two spaces  \n\nthird');
});

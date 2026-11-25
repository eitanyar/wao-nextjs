// The generated eligibility / waiting-list copy module matches its waocopy source byte for byte.
// HEBREW-SAFETY: zero Hebrew bytes; every expectation is read from the source file at runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { ELIGIBILITY_KEYS, extractJsonBlock, generate, OUTPUT_URL, SOURCE_URL } from './build-site-bot-eligibility-copy.mjs';

test('eligibilityCopy.generated.ts is the generator output of the waocopy source (no hand edits)', () => {
  assert.equal(fs.readFileSync(OUTPUT_URL, 'utf8'), generate(fs.readFileSync(SOURCE_URL, 'utf8')));
});

test('every value is byte-exact from the fenced json block; the key set is the 14 keys the page reads', () => {
  const source = extractJsonBlock(fs.readFileSync(SOURCE_URL, 'utf8'));
  assert.deepEqual(Object.keys(source).sort(), [...ELIGIBILITY_KEYS].sort());
  const generated = fs.readFileSync(OUTPUT_URL, 'utf8');
  for (const key of ELIGIBILITY_KEYS) assert.ok(generated.includes(`${JSON.stringify(key)}: ${JSON.stringify(source[key])}`), key);
});

test('the extractor reads exactly one fenced json block and ignores the prose around it', () => {
  assert.deepEqual(extractJsonBlock('prose\n\n```json\n{"A": "b"}\n```\n\nmore prose'), { A: 'b' });
  assert.throws(() => extractJsonBlock('no block'), /exactly one/);
  assert.throws(() => extractJsonBlock('```json\n{}\n```\n```json\n{}\n```'), /exactly one/);
});

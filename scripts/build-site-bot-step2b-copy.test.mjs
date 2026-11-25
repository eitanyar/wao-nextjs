// The generated step-2b copy module matches its waocopy source byte for byte.
// HEBREW-SAFETY: zero Hebrew bytes; every expectation is read from the source file at runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildModel, extractJsonBlock, generate, OUTPUT_URL, readSource, STEP2B_KEYS } from './build-site-bot-step2b-copy.mjs';

test('step2bCopy.generated.ts is the generator output of the waocopy source (no hand edits)', () => {
  assert.equal(fs.readFileSync(OUTPUT_URL, 'utf8'), generate(readSource()));
});

test('every value is byte-exact from the fenced json block; the key set is exactly the 40 keys step 2b reads', () => {
  const generated = fs.readFileSync(OUTPUT_URL, 'utf8');
  const source = extractJsonBlock(readSource());
  assert.deepEqual(Object.keys(source).sort(), [...STEP2B_KEYS].sort());
  for (const key of STEP2B_KEYS) assert.ok(generated.includes(`${JSON.stringify(key)}: ${JSON.stringify(source[key])}`), key);
  assert.deepEqual(Object.keys(buildModel(readSource())), STEP2B_KEYS);
  assert.equal(STEP2B_KEYS.length, 40);
});

test('no step-2b string carries a placeholder or a line break', () => {
  const model = buildModel(readSource());
  for (const key of STEP2B_KEYS) {
    assert.doesNotMatch(model[key], /[{}]/, key);
    assert.doesNotMatch(model[key], /\n/, key);
  }
});

test('the extractor reads exactly one fenced json block; a source with a missing or extra key is rejected', () => {
  assert.deepEqual(extractJsonBlock('prose\n\n```json\n{"A": "b"}\n```\n\nmore prose'), { A: 'b' });
  assert.throws(() => extractJsonBlock('no block'), /exactly one/);
  const source = extractJsonBlock(readSource());
  assert.throws(() => buildModel('```json\n' + JSON.stringify({ ...source, EXTRA: 'x' }) + '\n```'), /source keys differ/);
  const missing = { ...source };
  delete missing.STEP_CONTINUE;
  assert.throws(() => buildModel('```json\n' + JSON.stringify(missing) + '\n```'), /missing: STEP_CONTINUE/);
});

// The generated step-2b copy module matches its waocopy sources byte for byte.
// HEBREW-SAFETY: zero Hebrew bytes; every expectation is read from the source files at runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildModel, buildSourceModel, extractJsonBlock, generate, OUTPUT_URL, readSources, SOURCES, STEP2B_KEYS } from './build-site-bot-step2b-copy.mjs';

test('step2bCopy.generated.ts is the generator output of the waocopy sources (no hand edits)', () => {
  assert.equal(fs.readFileSync(OUTPUT_URL, 'utf8'), generate(readSources()));
});

test('every value is byte-exact from its fenced json block; the key set is exactly the 44 keys step 2b reads', () => {
  const generated = fs.readFileSync(OUTPUT_URL, 'utf8');
  const texts = readSources();
  SOURCES.forEach((source, index) => {
    const json = extractJsonBlock(texts[index]);
    assert.deepEqual(Object.keys(json).sort(), [...source.keys].sort(), source.name);
    for (const key of source.keys) assert.ok(generated.includes(`${JSON.stringify(key)}: ${JSON.stringify(json[key])}`), key);
  });
  assert.deepEqual(Object.keys(buildModel(texts)), STEP2B_KEYS);
  assert.equal(STEP2B_KEYS.length, 44);
  assert.equal(new Set(STEP2B_KEYS).size, STEP2B_KEYS.length);
});

test('the a11y status keys keep their combining marks (niqqud) byte-exact, NFC/NFD untouched', () => {
  const texts = readSources();
  const json = extractJsonBlock(texts[1]);
  const model = buildModel(texts);
  for (const key of ['FACT_STATUS_CONFIRMED', 'FACT_STATUS_EDITED']) {
    assert.match(json[key], /[\u0591-\u05C7]/, `${key} carries niqqud in the source`);
    assert.equal(Buffer.from(model[key], 'utf8').toString('hex'), Buffer.from(json[key], 'utf8').toString('hex'), key);
  }
});

test('no step-2b string carries a placeholder or a line break', () => {
  const model = buildModel(readSources());
  for (const key of STEP2B_KEYS) {
    assert.doesNotMatch(model[key], /[{}]/, key);
    assert.doesNotMatch(model[key], /\n/, key);
  }
});

test('the extractor reads exactly one fenced json block; a source with a missing or extra key is rejected', () => {
  assert.deepEqual(extractJsonBlock('prose\n\n```json\n{"A": "b"}\n```\n\nmore prose'), { A: 'b' });
  assert.throws(() => extractJsonBlock('no block'), /exactly one/);
  const texts = readSources();
  const source = extractJsonBlock(texts[0]);
  assert.throws(() => buildSourceModel('```json\n' + JSON.stringify({ ...source, EXTRA: 'x' }) + '\n```', SOURCES[0]), /source keys differ/);
  const missing = { ...source };
  delete missing.STEP_CONTINUE;
  assert.throws(() => buildSourceModel('```json\n' + JSON.stringify(missing) + '\n```', SOURCES[0]), /missing: STEP_CONTINUE/);
  const a11y = { ...extractJsonBlock(texts[1]) };
  delete a11y.FACT_FIX_CANCEL;
  assert.throws(() => buildModel([texts[0], '```json\n' + JSON.stringify(a11y) + '\n```']), /missing: FACT_FIX_CANCEL/);
  assert.throws(() => buildModel([texts[0]]), /expected 2 source texts/);
});

// The generated step-2a copy module matches its waocopy sources byte for byte.
// HEBREW-SAFETY: zero Hebrew bytes; every expectation is read from the source files at runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildModel, extractJsonBlock, generate, OUTPUT_URL, readSources, SOURCES, STEP2A_KEYS } from './build-site-bot-step2a-copy.mjs';

test('step2aCopy.generated.ts is the generator output of both waocopy sources (no hand edits)', () => {
  assert.equal(SOURCES.length, 2);
  assert.equal(fs.readFileSync(OUTPUT_URL, 'utf8'), generate(readSources()));
});

test('every value is byte-exact from its fenced json block; the key set is exactly the keys step 2a reads', () => {
  const generated = fs.readFileSync(OUTPUT_URL, 'utf8');
  const texts = readSources();
  SOURCES.forEach((spec, index) => {
    const source = extractJsonBlock(texts[index]);
    assert.deepEqual(Object.keys(source).sort(), [...spec.keys, ...spec.dropped].sort(), spec.name);
    for (const key of spec.keys) assert.ok(generated.includes(`${JSON.stringify(key)}: ${JSON.stringify(source[key])}`), key);
  });
  assert.deepEqual(Object.keys(buildModel(texts)), STEP2A_KEYS);
  assert.equal(STEP2A_KEYS.length, 18);
});

test('the reminder body interpolates only {businessName}; the CTA and the other strings carry no placeholder', () => {
  const model = buildModel(readSources());
  assert.deepEqual([...model.REMINDER_BODY.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(match => match[1]), ['businessName']);
  for (const key of STEP2A_KEYS.filter(key => key !== 'REMINDER_BODY')) assert.doesNotMatch(model[key], /[{}]/, key);
});

test('the extractor reads exactly one fenced json block; a source with a missing or extra key is rejected', () => {
  assert.deepEqual(extractJsonBlock('prose\n\n```json\n{"A": "b"}\n```\n\nmore prose'), { A: 'b' });
  assert.throws(() => extractJsonBlock('no block'), /exactly one/);
  const texts = readSources();
  const holding = extractJsonBlock(texts[1]);
  assert.throws(() => buildModel([texts[0], '```json\n' + JSON.stringify({ ...holding, EXTRA: 'x' }) + '\n```']), /source keys differ/);
  const missing = { ...holding };
  delete missing.EXPIRED_CTA;
  assert.throws(() => buildModel([texts[0], '```json\n' + JSON.stringify(missing) + '\n```']), /source keys differ/);
});

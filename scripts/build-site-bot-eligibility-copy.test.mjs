// The generated eligibility / waiting-list copy module matches its waocopy sources byte for byte.
// HEBREW-SAFETY: zero Hebrew bytes; every expectation is read from the source files at runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  buildModel, ELIGIBILITY_KEYS, extractJsonBlock, generate, OUTPUT_URL, readSources, SOURCES,
} from './build-site-bot-eligibility-copy.mjs';

test('eligibilityCopy.generated.ts is the generator output of both waocopy sources (no hand edits)', () => {
  assert.equal(SOURCES.length, 2);
  assert.equal(fs.readFileSync(OUTPUT_URL, 'utf8'), generate(readSources()));
});

test('every value is byte-exact from its fenced json block; the key set is exactly the keys the page reads', () => {
  const generated = fs.readFileSync(OUTPUT_URL, 'utf8');
  const texts = readSources();
  SOURCES.forEach((spec, index) => {
    const source = extractJsonBlock(texts[index]);
    assert.deepEqual(Object.keys(source).sort(), [...spec.keys, ...spec.dropped].sort(), spec.name);
    for (const key of spec.keys) assert.ok(generated.includes(`${JSON.stringify(key)}: ${JSON.stringify(source[key])}`), key);
  });
  assert.deepEqual(Object.keys(buildModel(texts)), ELIGIBILITY_KEYS);
  assert.equal(ELIGIBILITY_KEYS.length, 18);
});

test('the old single profile string is no longer generated; the two per-cause strings are', () => {
  const model = buildModel(readSources());
  assert.equal(Object.hasOwn(model, 'NOT_ELIGIBLE_PROFILE'), false);
  for (const key of ['NOT_ELIGIBLE_PROFILE_CLOSED', 'NOT_ELIGIBLE_PROFILE_NO_RATINGS', 'WAITLIST_INVALID_NAME',
    'WAITLIST_INVALID_PHONE', 'WAITLIST_INVALID_EMAIL']) assert.equal(typeof model[key], 'string', key);
});

test('the extractor reads exactly one fenced json block and ignores the prose around it', () => {
  assert.deepEqual(extractJsonBlock('prose\n\n```json\n{"A": "b"}\n```\n\nmore prose'), { A: 'b' });
  assert.throws(() => extractJsonBlock('no block'), /exactly one/);
  assert.throws(() => extractJsonBlock('```json\n{}\n```\n```json\n{}\n```'), /exactly one/);
});

test('a source with a missing or extra key is rejected', () => {
  const texts = readSources();
  const fixes = extractJsonBlock(texts[1]);
  const extra = '```json\n' + JSON.stringify({ ...fixes, EXTRA: 'x' }) + '\n```';
  assert.throws(() => buildModel([texts[0], extra]), /source keys differ/);
  const missing = { ...fixes };
  delete missing.WAITLIST_INVALID_NAME;
  assert.throws(() => buildModel([texts[0], '```json\n' + JSON.stringify(missing) + '\n```']), /source keys differ/);
});

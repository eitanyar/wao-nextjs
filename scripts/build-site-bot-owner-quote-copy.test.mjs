// The generated owner-quote copy module matches its waocopy sources byte for byte.
// HEBREW-SAFETY: zero Hebrew bytes; every expectation is read from the source files at runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildModel, buildSourceModel, extractJsonBlock, FRAME_KEYS, generate, OUTPUT_URL, OWNER_QUOTE_KEYS, readSources, SOURCES } from './build-site-bot-owner-quote-copy.mjs';

test('ownerQuoteCopy.generated.ts is the generator output of the waocopy sources (no hand edits)', () => {
  assert.equal(fs.readFileSync(OUTPUT_URL, 'utf8'), generate(readSources()));
});

test('every value is byte-exact from its fenced json block; the module carries the 5 frames, the fallback and the aria label', () => {
  const texts = readSources();
  const model = buildModel(texts);
  assert.deepEqual(Object.keys(model), OWNER_QUOTE_KEYS);
  assert.deepEqual(OWNER_QUOTE_KEYS, [...FRAME_KEYS, 'QUOTE_NAME_FALLBACK', 'OWNER_QUOTE_ARIA_LABEL']);
  SOURCES.forEach((source, index) => {
    const json = extractJsonBlock(texts[index]);
    for (const key of source.pick ?? source.keys) {
      assert.equal(Buffer.from(model[key], 'utf8').toString('hex'), Buffer.from(json[key], 'utf8').toString('hex'), key);
    }
  });
  for (const key of FRAME_KEYS) {
    assert.equal(model[key].split('{name}').length - 1, 1, key);
    assert.ok(model[key].endsWith(':'), key);
  }
  assert.doesNotMatch(model.QUOTE_NAME_FALLBACK, /[{}:]/);
  assert.doesNotMatch(model.OWNER_QUOTE_ARIA_LABEL, /[{}]/);
  // The replaced signature keys never reach the module.
  assert.doesNotMatch(fs.readFileSync(OUTPUT_URL, 'utf8'), /OWNER_QUOTE_ATTRIBUTION_/);
});

test('a source with a missing key, a frame without {name} or without its colon is rejected', () => {
  const texts = readSources();
  const frames = extractJsonBlock(texts[0]);
  const wrap = value => '```json\n' + JSON.stringify(value) + '\n```';
  const missing = { ...frames };
  delete missing.QUOTE_FRAME_JOB;
  assert.throws(() => buildSourceModel(wrap(missing), SOURCES[0]), /missing: QUOTE_FRAME_JOB/);
  assert.throws(() => buildSourceModel(wrap({ ...frames, QUOTE_FRAME_JOB: frames.QUOTE_FRAME_JOB.replace('{name}', 'x') }), SOURCES[0]), /placeholders differ/);
  assert.throws(() => buildSourceModel(wrap({ ...frames, QUOTE_FRAME_JOB: frames.QUOTE_FRAME_JOB.replace(/:$/, '') }), SOURCES[0]), /colon/);
  assert.throws(() => buildModel([texts[0]]), /expected 2 source texts/);
});

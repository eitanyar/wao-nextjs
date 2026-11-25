// The generated step-2c copy module matches its waocopy sources byte for byte.
// HEBREW-SAFETY: zero Hebrew bytes; every expectation is read from the source files at runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildModel, buildSourceModel, extractJsonBlock, generate, NET_TOKEN, OUTPUT_URL, PLACEHOLDERS, PRICE, readSources, SOURCES, STEP2C_KEYS } from './build-site-bot-step2c-copy.mjs';

/** The generated value with the price token filled back (what the page shows). */
const filled = value => value.split(NET_TOKEN).join(PRICE);

test('step2cCopy.generated.ts is the generator output of the waocopy sources (no hand edits)', () => {
  assert.equal(fs.readFileSync(OUTPUT_URL, 'utf8'), generate(readSources()));
});

test('every value is byte-exact from its fenced json block; the key set is exactly the 16 keys step 2c reads', () => {
  const generated = fs.readFileSync(OUTPUT_URL, 'utf8');
  const texts = readSources();
  SOURCES.forEach((source, index) => {
    const json = extractJsonBlock(texts[index]);
    assert.deepEqual(Object.keys(json).sort(), [...source.keys].sort(), source.name);
    for (const key of source.keys) {
      assert.ok(generated.includes(`${JSON.stringify(key)}: ${JSON.stringify(buildModel(texts)[key])}`), key);
      assert.equal(Buffer.from(filled(buildModel(texts)[key]), 'utf8').toString('hex'), Buffer.from(json[key], 'utf8').toString('hex'), key);
    }
  });
  assert.deepEqual(Object.keys(buildModel(texts)), STEP2C_KEYS);
  assert.equal(STEP2C_KEYS.length, 16);
  assert.equal(new Set(STEP2C_KEYS).size, STEP2C_KEYS.length);
});

test('only the email keys carry placeholders, exactly the documented ones', () => {
  const model = buildModel(readSources());
  for (const key of STEP2C_KEYS) {
    const found = (model[key].match(/\{[A-Za-z]+\}/g) ?? []).filter(item => item !== NET_TOKEN);
    assert.deepEqual(found.sort(), [...(PLACEHOLDERS[key] ?? [])].sort(), key);
  }
  // The price is a token only in PAY_CTA_SUB, once; no literal 199 is left in the module.
  assert.equal(model.PAY_CTA_SUB.split(NET_TOKEN).length - 1, 1);
  assert.doesNotMatch(fs.readFileSync(OUTPUT_URL, 'utf8'), /(?<![\d.])199(?![\d.])/);
  // The plain-text fallback puts the preview URL on its own line.
  assert.match(model.GENERATING_EMAIL_BODY, /\n\{previewUrl\}$/);
});

test('the extractor reads exactly one fenced json block; a source with a missing or extra key is rejected', () => {
  assert.deepEqual(extractJsonBlock('prose\n\n```json\n{"A": "b"}\n```\n\nmore prose'), { A: 'b' });
  assert.throws(() => extractJsonBlock('no block'), /exactly one/);
  const texts = readSources();
  const source = extractJsonBlock(texts[0]);
  assert.throws(() => buildSourceModel('```json\n' + JSON.stringify({ ...source, EXTRA: 'x' }) + '\n```', SOURCES[0]), /source keys differ/);
  const missing = { ...source };
  delete missing.PAY_CTA;
  assert.throws(() => buildSourceModel('```json\n' + JSON.stringify(missing) + '\n```', SOURCES[0]), /missing: PAY_CTA/);
  const noUrl = { ...source, GENERATING_EMAIL_BODY: source.GENERATING_EMAIL_BODY.replace('{previewUrl}', 'x') };
  assert.throws(() => buildSourceModel('```json\n' + JSON.stringify(noUrl) + '\n```', SOURCES[0]), /placeholders differ/);
  assert.throws(() => buildModel([texts[0]]), /expected 2 source texts/);
});

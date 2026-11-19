// The generated post-payment copy module matches its approved source byte for byte.
// HEBREW-SAFETY: zero Hebrew bytes; every expectation is read from the source JSON at runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { generate, OUTPUT_URL, POSTPAY_KEYS, SOURCE_URL } from './build-site-bot-postpay-copy.mjs';

test('postPayCopy.generated.ts is the generator output of the FINAL source (no hand edits)', () => {
  assert.equal(fs.readFileSync(OUTPUT_URL, 'utf8'), generate(fs.readFileSync(SOURCE_URL, 'utf8')));
});

test('every value is byte-exact from the source; the key set is the 16 approved keys', () => {
  const source = JSON.parse(fs.readFileSync(SOURCE_URL, 'utf8'));
  assert.deepEqual(Object.keys(source).sort(), [...POSTPAY_KEYS].sort());
  const generated = fs.readFileSync(OUTPUT_URL, 'utf8');
  for (const key of POSTPAY_KEYS) assert.ok(generated.includes(`${JSON.stringify(key)}: ${JSON.stringify(source[key])}`), key);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { decryptToken } from './gsc-token-decrypt.mjs';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

// Fixture ciphertext built with Node's own `crypto` module (same algorithm
// as src/lib/payments/crypto.ts's encryptToken), not a hand-rolled format.
function encryptFixture(plaintext, keyB64) {
  const key = Buffer.from(keyB64, 'base64');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':');
}

test('decryptToken round-trips a value encrypted with the same fixture key', () => {
  const keyB64 = crypto.randomBytes(32).toString('base64');
  const plaintext = 'fixture-refresh-token-1234567890';
  const encoded = encryptFixture(plaintext, keyB64);

  const decrypted = decryptToken(encoded, keyB64);
  assert.equal(decrypted, plaintext);
});

test('decryptToken throws a clear error when the key is missing', () => {
  const keyB64 = crypto.randomBytes(32).toString('base64');
  const encoded = encryptFixture('some-token', keyB64);
  assert.throws(() => decryptToken(encoded, undefined), /TOKEN_ENCRYPTION_KEY is not set/);
});

test('decryptToken throws a clear error when the key does not decode to 32 bytes', () => {
  const keyB64 = crypto.randomBytes(32).toString('base64');
  const encoded = encryptFixture('some-token', keyB64);
  const badKeyB64 = Buffer.from('too-short').toString('base64');
  assert.throws(() => decryptToken(encoded, badKeyB64), /must decode to exactly 32 bytes/);
});

test('decryptToken throws on malformed ciphertext format', () => {
  const keyB64 = crypto.randomBytes(32).toString('base64');
  assert.throws(() => decryptToken('not-the-right-format', keyB64), /Malformed encrypted token/);
});

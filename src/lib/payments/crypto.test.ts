import test from 'node:test';
import assert from 'node:assert';

process.env.TOKEN_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; // 32 zero bytes, base64, test-only

import { encryptToken, decryptToken } from './crypto';

test('encryptToken/decryptToken round-trips a plaintext token', () => {
  const plaintext = 'super-secret-provider-token-12345';
  const encrypted = encryptToken(plaintext);
  assert.notStrictEqual(encrypted, plaintext);
  const decrypted = decryptToken(encrypted);
  assert.strictEqual(decrypted, plaintext);
});

test('encryptToken produces different ciphertext each call (random IV)', () => {
  const plaintext = 'same-token';
  const a = encryptToken(plaintext);
  const b = encryptToken(plaintext);
  assert.notStrictEqual(a, b);
  assert.strictEqual(decryptToken(a), plaintext);
  assert.strictEqual(decryptToken(b), plaintext);
});

test('decryptToken throws on tampered ciphertext', () => {
  const encrypted = encryptToken('another-token');
  const parts = encrypted.split(':');
  // Flip the ciphertext so GCM auth-tag verification fails.
  const tamperedCiphertext = Buffer.from(parts[2], 'base64');
  tamperedCiphertext[0] ^= 0xff;
  const tampered = [parts[0], parts[1], tamperedCiphertext.toString('base64')].join(':');
  assert.throws(() => decryptToken(tampered));
});

test('encryptToken throws loudly when TOKEN_ENCRYPTION_KEY is unset', () => {
  const original = process.env.TOKEN_ENCRYPTION_KEY;
  delete process.env.TOKEN_ENCRYPTION_KEY;
  try {
    assert.throws(() => encryptToken('x'), /TOKEN_ENCRYPTION_KEY/);
  } finally {
    process.env.TOKEN_ENCRYPTION_KEY = original;
  }
});

/**
 * Standalone decrypt helper for per-client GSC refresh tokens.
 *
 * Duplicates ONLY the decrypt half of `src/lib/payments/crypto.ts`'s
 * `encryptToken`/`decryptToken` algorithm using Node's built-in `crypto`
 * module, so plain-ESM scripts (no build step, no `@/` path-alias
 * resolution) can decrypt `data/clients/{clientId}/gsc-token.json` without
 * importing TypeScript source.
 *
 * Ciphertext format (all base64, colon-joined): `iv:authTag:ciphertext`.
 * Algorithm: aes-256-gcm, 12-byte IV, key = base64-decoded TOKEN_ENCRYPTION_KEY
 * (must decode to exactly 32 bytes) — must stay byte-for-byte compatible with
 * `src/lib/payments/crypto.ts`.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function decryptToken(encoded, keyB64) {
  if (!keyB64) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and set it in the environment.'
    );
  }
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (got ${key.length}). Generate one with \`openssl rand -base64 32\`.`
    );
  }

  const parts = encoded.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted token: expected "iv:authTag:ciphertext" format.');
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Signs and verifies the OAuth state parameter for Site-Bot GBP connection flow
 * (/api/site-bot/gbp/oauth/start -> Google -> /api/site-bot/gbp/oauth/callback).
 *
 * HEBREW-SAFETY: ZERO Hebrew bytes. All strings and comments are ASCII.
 */

import crypto from 'crypto';
import { UUID_REGEX } from './auditStore';

const EXPIRY_MS = 15 * 60 * 1000; // 15 minutes TTL

function getSecret(): string {
  const secret = process.env.CLIENT_PORTAL_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CLIENT_PORTAL_SECRET must be configured in production');
  }
  return 'wao-dev-secret-change-in-production';
}

function hmacHex(data: string, secret: string = getSecret()): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export function signGbpOAuthState(auditId: string, customSecret?: string): string {
  const expiry = Date.now() + EXPIRY_MS;
  const payload = `${auditId}:${expiry}`;
  const sig = hmacHex(payload, customSecret || getSecret());
  return `${payload}:${sig}`;
}

export function verifyGbpOAuthState(
  state: string,
  customSecret?: string
): { valid: boolean; auditId?: string } {
  if (!state || typeof state !== 'string') {
    return { valid: false };
  }

  const parts = state.split(':');
  if (parts.length !== 3) {
    return { valid: false };
  }

  const [auditId, expiryStr, sig] = parts;
  if (!auditId || !expiryStr || !sig) {
    return { valid: false };
  }

  if (!UUID_REGEX.test(auditId)) {
    return { valid: false };
  }

  const expiry = parseInt(expiryStr, 10);
  if (Number.isNaN(expiry) || Date.now() > expiry) {
    return { valid: false };
  }

  const payload = `${auditId}:${expiryStr}`;
  let expectedSig: string;
  try {
    expectedSig = hmacHex(payload, customSecret || getSecret());
  } catch {
    return { valid: false };
  }

  if (Buffer.byteLength(sig) !== Buffer.byteLength(expectedSig)) {
    return { valid: false };
  }

  try {
    const isMatch = crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expectedSig, 'utf8'));
    if (!isMatch) {
      return { valid: false };
    }
  } catch {
    return { valid: false };
  }

  return { valid: true, auditId };
}

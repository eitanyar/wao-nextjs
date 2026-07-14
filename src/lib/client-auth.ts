/**
 * Edge-compatible session token signing for the client portal.
 * Uses Web Crypto API (available in both edge middleware and Node.js).
 *
 * Token format: {clientId}.{expiryMs}.{hmac-hex}
 * Cookie name:  wao-client
 */

export const COOKIE_NAME = 'wao-client';
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const secret = process.env.CLIENT_PORTAL_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CLIENT_PORTAL_SECRET must be configured in production');
  }
  return 'wao-dev-secret-change-in-production';
}

async function hmacHex(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createSessionToken(clientId: string): Promise<string> {
  const expiry  = Date.now() + EXPIRY_MS;
  const payload = `${clientId}.${expiry}`;
  const sig     = await hmacHex(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<string | null> {
  if (!token) return null;
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return null;

  const payload = token.slice(0, lastDot);
  const sig     = token.slice(lastDot + 1);

  const parts = payload.split('.');
  if (parts.length !== 2) return null;
  const [clientId, expiryStr] = parts;

  if (Date.now() > parseInt(expiryStr, 10)) return null;

  const expected = await hmacHex(payload);
  if (sig !== expected) return null;

  return clientId;
}

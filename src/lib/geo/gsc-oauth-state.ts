/**
 * Signs/verifies the OAuth `state` param for the self-serve GSC connect flow
 * (`/api/geo/gsc/oauth/start` -> Google -> `/api/geo/gsc/oauth/callback`).
 * Short-lived (10 min), HMAC-signed, same payload shape as
 * `src/lib/client-auth.ts`'s session token but via Node's sync `crypto`
 * (these routes run in the Node runtime, no edge-compat need here).
 */

import crypto from 'crypto';

const EXPIRY_MS = 10 * 60 * 1000; // 10 minutes — just long enough for the Google consent screen

function getSecret(): string {
  const secret = process.env.CLIENT_PORTAL_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CLIENT_PORTAL_SECRET must be configured in production');
  }
  return 'wao-dev-secret-change-in-production';
}

function hmacHex(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('hex');
}

export function signGscOAuthState(clientId: string): string {
  const expiry = Date.now() + EXPIRY_MS;
  const payload = `${clientId}.${expiry}`;
  return `${payload}.${hmacHex(payload)}`;
}

export function verifyGscOAuthState(state: string): string | null {
  if (!state) return null;
  const lastDot = state.lastIndexOf('.');
  if (lastDot === -1) return null;

  const payload = state.slice(0, lastDot);
  const sig = state.slice(lastDot + 1);
  const parts = payload.split('.');
  if (parts.length !== 2) return null;
  const [clientId, expiryStr] = parts;

  if (Date.now() > parseInt(expiryStr, 10)) return null;
  if (hmacHex(payload) !== sig) return null;

  return clientId;
}

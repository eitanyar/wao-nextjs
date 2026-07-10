/**
 * Edge-compatible shared-secret admin gate for Eitan's cross-client GEO dashboard
 * (/geo/dashboard). Deliberately simple — single admin user today, not a role system.
 *
 * Token format: {issuedAtMs}.{hmac-hex}
 * Cookie name:  wao-admin
 */

export const ADMIN_COOKIE_NAME = 'wao-admin';
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getAdminSecret(): string {
  return process.env.ADMIN_SECRET ?? '';
}

async function hmacHex(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Compares the entered secret against ADMIN_SECRET. Returns false if unset. */
export async function verifyAdminSecret(entered: string): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;
  return entered === secret;
}

/**
 * Master-admin username+password gate (/admin/login) — separate credential
 * pair from ADMIN_SECRET, but issues the SAME wao-admin token/cookie. Used
 * for Eitan's cross-client login-as-any-client flow (/admin/clients).
 */
export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  const expectedUser = process.env.ADMIN_USERNAME ?? '';
  const expectedPass = process.env.ADMIN_PASSWORD ?? '';
  if (!expectedUser || !expectedPass) return false;
  return username === expectedUser && password === expectedPass;
}

export async function createAdminToken(): Promise<string> {
  const secret = getAdminSecret();
  const payload = `${Date.now() + EXPIRY_MS}`;
  const sig = await hmacHex(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  if (!token) return false;
  const secret = getAdminSecret();
  if (!secret) return false;

  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return false;

  const expiryStr = token.slice(0, lastDot);
  const sig       = token.slice(lastDot + 1);
  const expiry    = parseInt(expiryStr, 10);
  if (!expiry || Date.now() > expiry) return false;

  const expected = await hmacHex(expiryStr, secret);
  return sig === expected;
}

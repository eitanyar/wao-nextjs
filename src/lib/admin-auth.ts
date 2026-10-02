/**
 * Edge-compatible shared-secret admin gate for Eitan's cross-client GEO dashboard
 * (/geo/dashboard). Deliberately simple — single admin user today, not a role system.
 *
 * Token format: {issuedAtMs}.{hmac-hex}
 * Cookie name:  wao-admin
 */

export const ADMIN_COOKIE_NAME = 'wao-admin';
export const ADMIN_CLIENT_FIXTURE_TOKEN = 'wao-admin-client-fixture-v1';
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const FIXTURE_ROOT_PATTERN = /^\/tmp\/wao-client-auth-ui-[A-Za-z0-9_-]{1,64}$/;
const FIXTURE_AUDIT_ROOT_PATTERN = /^\/tmp\/wao-client-auth-audit-[A-Za-z0-9_-]{1,64}$/;
const PRODUCTION_FIXTURE_TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const LOOPBACK_FIXTURE_HOST_PATTERN = /^127\.0\.0\.1:31(?:1\d|[2-9]\d)$/;

function fixedLengthConstantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function verifyAdminClientFixtureAccess(token: string, pathname: string, fixtureRoot: string | undefined, requestHost?: string | null): Promise<'live' | 'synthetic' | null> {
  if (token === ADMIN_CLIENT_FIXTURE_TOKEN) {
    const validFixture = process.env.NODE_ENV !== 'production'
      && process.env.WAO_ADMIN_AUTH_DEV_FIXTURE_ENABLE === '1'
      && process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE === '1'
      && pathname === '/admin/clients'
      && fixtureRoot === process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT
      && FIXTURE_ROOT_PATTERN.test(fixtureRoot ?? '');
    return validFixture ? 'synthetic' : null;
  }

  const configuredProductionToken = process.env.WAO_ADMIN_AUTH_PRODUCTION_FIXTURE_TOKEN ?? '';
  const validProductionFixture = process.env.NODE_ENV === 'production'
    && process.env.WAO_ADMIN_AUTH_PRODUCTION_FIXTURE_ENABLE === '1'
    && process.env.WAO_ADMIN_AUTH_DEV_FIXTURE_ENABLE === '1'
    && process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE === '1'
    && PRODUCTION_FIXTURE_TOKEN_PATTERN.test(token)
    && PRODUCTION_FIXTURE_TOKEN_PATTERN.test(configuredProductionToken)
    && token !== ADMIN_CLIENT_FIXTURE_TOKEN
    && configuredProductionToken !== ADMIN_CLIENT_FIXTURE_TOKEN
    && fixedLengthConstantTimeEqual(token, configuredProductionToken)
    && pathname === '/admin/clients'
    && fixtureRoot === process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT
    && FIXTURE_ROOT_PATTERN.test(fixtureRoot ?? '')
    && FIXTURE_AUDIT_ROOT_PATTERN.test(process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_AUDIT_ROOT ?? '')
    && LOOPBACK_FIXTURE_HOST_PATTERN.test(requestHost ?? '')
    && !(process.env.ADMIN_SECRET ?? '')
    && !(process.env.ADMIN_USERNAME ?? '')
    && !(process.env.ADMIN_PASSWORD ?? '');
  if (validProductionFixture) return 'synthetic';

  return await verifyAdminToken(token) ? 'live' : null;
}

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

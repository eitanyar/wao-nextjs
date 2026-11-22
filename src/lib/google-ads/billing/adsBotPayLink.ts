/**
 * Signed Ads Bot pay links: /google-ads/pay?t=<token>. The token carries the client id and the owner's email and
 * expires; it is HMAC-SHA256 signed with ADS_BOT_PAY_LINK_SECRET (no secret = no link can be made or verified).
 * Nothing is stored: the link is valid until it expires. Zero Hebrew in this module.
 */
import crypto from 'crypto';

export const ADS_BOT_PAY_PATH = '/google-ads/pay';
export const PAY_LINK_TTL_DAYS = 14;

const CLIENT_ID = /^[a-z0-9-]+$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PayLinkClaims {
  clientId: string;
  email: string;
  /** Expiry, epoch milliseconds. */
  expiresAt: number;
}

function secret(env: Readonly<Record<string, string | undefined>>): string | null {
  const value = env.ADS_BOT_PAY_LINK_SECRET ?? '';
  return value.length >= 32 ? value : null;
}

function sign(payload: string, key: string): string {
  return crypto.createHmac('sha256', key).update(payload).digest('base64url');
}

export function createPayLinkToken(
  claims: { clientId: string; email: string },
  options: { now?: Date; env?: Readonly<Record<string, string | undefined>> } = {},
): string {
  const key = secret(options.env ?? process.env);
  if (!key) throw new Error('ADS_BOT_PAY_LINK_SECRET is not set (min 32 chars)');
  if (!CLIENT_ID.test(claims.clientId)) throw new Error('invalid clientId');
  const email = claims.email.trim();
  if (!EMAIL.test(email)) throw new Error('invalid email');
  const expiresAt = (options.now ?? new Date()).getTime() + PAY_LINK_TTL_DAYS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ c: claims.clientId, e: email, x: expiresAt }), 'utf8').toString('base64url');
  return `${payload}.${sign(payload, key)}`;
}

export function verifyPayLinkToken(
  token: unknown,
  options: { now?: Date; env?: Readonly<Record<string, string | undefined>> } = {},
): PayLinkClaims | null {
  const key = secret(options.env ?? process.env);
  if (!key || typeof token !== 'string' || token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = sign(payload, key);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { c?: unknown; e?: unknown; x?: unknown };
    if (typeof data.c !== 'string' || !CLIENT_ID.test(data.c)) return null;
    if (typeof data.e !== 'string' || !EMAIL.test(data.e)) return null;
    if (typeof data.x !== 'number' || data.x <= (options.now ?? new Date()).getTime()) return null;
    return { clientId: data.c, email: data.e, expiresAt: data.x };
  } catch {
    return null;
  }
}

export function buildPayLinkUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}${ADS_BOT_PAY_PATH}?t=${encodeURIComponent(token)}`;
}

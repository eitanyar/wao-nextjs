import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const PREVIEW_TOKEN_TTL_MS = 15 * 60_000;
export interface PreviewTokenPayload {
  businessName: string;
  city: string;
  category: string;
  issuedAt: number;
  jti: string;
}

export function mintPreviewToken(
  input: Pick<PreviewTokenPayload, 'businessName' | 'city' | 'category'>,
  secret: string,
  now = Date.now()
): string {
  if (!secret?.trim() || !Number.isSafeInteger(now) || !Number.isSafeInteger(now + PREVIEW_TOKEN_TTL_MS)) {
    throw new Error('Invalid token signing input');
  }
  const payload = Buffer.from(JSON.stringify({ ...input, issuedAt: now, jti: randomUUID() })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyPreviewToken(token: unknown, secret: string, now = Date.now()): PreviewTokenPayload | null {
  if (typeof token !== 'string' || !secret?.trim()) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null;
  const expected = createHmac('sha256', secret).update(parts[0]).digest();
  const supplied = Buffer.from(parts[1], 'base64url');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as PreviewTokenPayload;
    if (!payload || typeof payload !== 'object' ||
      typeof payload.businessName !== 'string' || !payload.businessName ||
      typeof payload.city !== 'string' || !payload.city ||
      typeof payload.category !== 'string' || !payload.category ||
      typeof payload.jti !== 'string' || !payload.jti ||
      !Number.isSafeInteger(payload.issuedAt) || !Number.isSafeInteger(now) ||
      payload.issuedAt > now || now - payload.issuedAt >= PREVIEW_TOKEN_TTL_MS) return null;
    return payload;
  } catch { return null; }
}

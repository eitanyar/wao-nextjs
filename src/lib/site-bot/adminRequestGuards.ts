// Shared guards for the Site-Bot client-message admin routes. The logic is copied from
// src/app/api/admin/site-bot/help-requests/status/route.ts, which is intentionally left unchanged.
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';

/** True when the request carries a valid admin cookie. */
export async function requireAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '');
}

// CSRF guard modelled on Next's own Server Action check: the Origin host must
// match x-forwarded-host (first value) or Host. request.url is not used because
// Next normalizes it (e.g. 127.0.0.1 -> localhost). A missing Origin is rejected.
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (!origin || (fetchSite && fetchSite !== 'same-origin')) return false;
  let originHost: string;
  try {
    const parsed = new URL(origin);
    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.origin !== origin) return false;
    originHost = parsed.host;
  } catch { return false; }
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = request.headers.get('host');
  return originHost === forwarded || originHost === host;
}

/**
 * Reads an `application/json` body as UTF-8 text, streamed with a byte cap. Throws 'invalid_input'
 * on a wrong content type, a missing body, invalid UTF-8 or more than `maxBytes`.
 */
export async function boundedJsonText(request: Request, maxBytes: number): Promise<string> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || !request.body) throw new Error('invalid_input');
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error('invalid_input'); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } catch {
    throw new Error('invalid_input');
  } finally {
    reader.releaseLock();
  }
}

/** Parses bounded JSON text into a plain object, or throws 'invalid_input'. */
export async function boundedJsonObject(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const text = await boundedJsonText(request, maxBytes);
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('invalid_input'); }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid_input');
  return parsed as Record<string, unknown>;
}

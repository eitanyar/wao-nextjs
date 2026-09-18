'use server';

import { createHash } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionToken, COOKIE_NAME } from '@/lib/client-auth';
import { verifyClientCredentials } from '@/lib/client-auth-store';
import { appendClientSecurityAudit } from '@/lib/client-security-audit';
import { checkRateLimit } from '@/lib/payments/rate-limit';

const WINDOW_MS = 15 * 60 * 1000;
type LoginActionState = { status: 'idle' | 'failure' };

function pseudonymize(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeNext(value: string): string {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/client/dashboard';
}

export async function loginAction(_: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const clientId = (formData.get('clientId') as string | null)?.trim() ?? '';
  const pin = (formData.get('pin') as string | null)?.trim() ?? '';
  const next = safeNext((formData.get('next') as string | null) ?? '/client/dashboard');
  const requestHeaders = await headers();
  const source = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipBucket = checkRateLimit(`client-login-ip:${pseudonymize(source)}`, { maxRequests: 10, windowMs: WINDOW_MS });
  const pairBucket = checkRateLimit(`client-login-pair:${pseudonymize(`${source}:${clientId}`)}`, { maxRequests: 5, windowMs: WINDOW_MS });
  if (!ipBucket.allowed || !pairBucket.allowed) {
    appendClientSecurityAudit('login-denied', { actorClass: 'client', outcomeClass: 'limited', target: clientId, source });
    return { status: 'failure' };
  }
  const result = await verifyClientCredentials(clientId, pin);
  if (!result.ok || !result.clientId || !result.sessionVersion) {
    appendClientSecurityAudit('login-denied', { actorClass: 'client', outcomeClass: 'denied', target: clientId, source });
    return { status: 'failure' };
  }
  const scope = result.mustChangePin ? 'change-pin' as const : 'full' as const;
  const token = await createSessionToken(result.clientId, { sessionVersion: result.sessionVersion, scope });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 30 * 24 * 60 * 60, path: '/' });
  appendClientSecurityAudit(result.legacyMigrated ? 'legacy-migrated' : 'login-succeeded', { actorClass: 'client', outcomeClass: 'allowed', target: result.clientId, source, sessionVersion: result.sessionVersion });
  redirect(scope === 'change-pin' ? '/client/change-pin' : next);
}

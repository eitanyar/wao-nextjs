'use server';

import { createHash } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_NAME, createSessionToken, verifyClientSession } from '@/lib/client-auth';
import { changeClientPin, verifyClientCredentials } from '@/lib/client-auth-store';
import { appendClientSecurityAudit } from '@/lib/client-security-audit';
import { validateClientPinPolicy } from '@/lib/client-pin';
import { checkRateLimit } from '@/lib/payments/rate-limit';

type ChangePinActionState = { status: 'idle' | 'mismatch' | 'policy-failure' | 'current-failure' | 'generic-failure' };

function pseudonymize(value: string): string { return createHash('sha256').update(value).digest('hex'); }

export async function changeClientPinAction(_: ChangePinActionState, formData: FormData): Promise<ChangePinActionState> {
  const jar = await cookies();
  const session = await verifyClientSession(jar.get(COOKIE_NAME)?.value ?? '', { scopes: ['full', 'change-pin'] });
  if (!session) redirect('/client/login');
  const source = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`client-change:${pseudonymize(`${source}:${session.clientId}`)}`, { maxRequests: 5, windowMs: 15 * 60 * 1000 }).allowed) return { status: 'generic-failure' };
  const nextPin = (formData.get('newPin') as string | null)?.trim() ?? '';
  const confirmation = (formData.get('confirmPin') as string | null)?.trim() ?? '';
  if (nextPin !== confirmation) return { status: 'mismatch' };
  if (!validateClientPinPolicy(nextPin)) return { status: 'policy-failure' };
  if (session.scope === 'full') {
    const currentPin = (formData.get('currentPin') as string | null)?.trim() ?? '';
    const credentials = await verifyClientCredentials(session.clientId, currentPin);
    if (!credentials.ok) return { status: 'current-failure' };
  }
  const changed = await changeClientPin(session.clientId, nextPin);
  if (!changed) return { status: 'generic-failure' };
  const token = await createSessionToken(session.clientId, { sessionVersion: changed.sessionVersion, scope: 'full' });
  jar.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 30 * 24 * 60 * 60, path: '/' });
  appendClientSecurityAudit(session.scope === 'change-pin' ? 'forced-change' : 'owner-change', { actorClass: 'client', outcomeClass: 'allowed', target: session.clientId, source, sessionVersion: changed.sessionVersion });
  redirect('/client/dashboard');
}

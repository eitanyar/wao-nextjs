'use server';

import { createHash } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminClientFixtureAccess, verifyAdminToken } from '@/lib/admin-auth';
import { createSessionToken, COOKIE_NAME } from '@/lib/client-auth';
import { readClientAuthRecord, resolveConfiguredClientAuthRoot, resetClientPin } from '@/lib/client-auth-store';
import { appendClientSecurityAudit } from '@/lib/client-security-audit';
import { validateClientPinPolicy } from '@/lib/client-pin';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { completeClientRecoveryContactVerification, requestClientRecoveryContactVerification, revealClientRecoveryContact } from '@/lib/client-recovery-contact';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export type RecoveryContactActionState = { status: 'idle' | 'sent' | 'complete' | 'revealed' | 'failed' | 'limited'; email?: string };

async function requireAdmin(): Promise<{ source: string; root?: string; auditRoot?: string } | null> {
  const jar = await cookies();
  const requestHeaders = await headers();
  const fixtureRootCandidate = process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT;
  const authorized = await verifyAdminClientFixtureAccess(jar.get(ADMIN_COOKIE_NAME)?.value ?? '', '/admin/clients', fixtureRootCandidate, requestHeaders.get('host'));
  if (!authorized) return null;
  const origin = requestHeaders.get('origin');
  const host = requestHeaders.get('host');
  if (!origin || !host || new URL(origin).host !== host) return null;
  const root = authorized === 'synthetic' ? resolveConfiguredClientAuthRoot({ productionSyntheticAuthorized: true }) : undefined;
  if (authorized === 'synthetic' && !root) return null;
  const auditRoot = authorized === 'synthetic' ? process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_AUDIT_ROOT : undefined;
  const syntheticAuditRoot: string | undefined = /^\/tmp\/wao-client-auth-audit-[A-Za-z0-9_-]{1,64}$/.test(auditRoot ?? '') ? auditRoot ?? undefined : undefined;
  return { source: requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown', root: root ?? undefined, auditRoot: syntheticAuditRoot };
}

export async function requestClientRecoveryContactVerificationAction(_previous: RecoveryContactActionState, formData: FormData): Promise<RecoveryContactActionState> {
  const context = await requireAdmin();
  if (!context) return { status: 'failed' };
  const clientId = typeof formData.get('clientId') === 'string' ? String(formData.get('clientId')).trim() : '';
  const email = typeof formData.get('email') === 'string' ? String(formData.get('email')).trim() : '';
  const result = await requestClientRecoveryContactVerification({ clientId, email }, { source: context.source, clientsRoot: context.root, auditRoot: context.auditRoot });
  return { status: result.status };
}

export async function completeClientRecoveryContactVerificationAction(_previous: RecoveryContactActionState, formData: FormData): Promise<RecoveryContactActionState> {
  const context = await requireAdmin();
  if (!context) return { status: 'failed' };
  const clientId = typeof formData.get('clientId') === 'string' ? String(formData.get('clientId')).trim() : '';
  const email = typeof formData.get('email') === 'string' ? String(formData.get('email')).trim() : '';
  const code = typeof formData.get('code') === 'string' ? String(formData.get('code')).trim() : '';
  const result = await completeClientRecoveryContactVerification({ clientId, email, code }, { source: context.source, clientsRoot: context.root, auditRoot: context.auditRoot });
  return { status: result.status };
}

export async function revealClientRecoveryContactAction(_previous: RecoveryContactActionState, formData: FormData): Promise<RecoveryContactActionState> {
  const context = await requireAdmin();
  if (!context) return { status: 'failed' };
  const clientId = typeof formData.get('clientId') === 'string' ? String(formData.get('clientId')).trim() : '';
  const email = await revealClientRecoveryContact(clientId, { source: context.source, clientsRoot: context.root, auditRoot: context.auditRoot });
  return email ? { status: 'revealed', email } : { status: 'failed' };
}

export async function loginAsClientAction(formData: FormData) {
  const jar = await cookies();
  if (!await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '')) redirect('/admin/login?error=1&next=/admin/clients');
  const clientId = (formData.get('clientId') as string | null)?.trim() ?? '';
  const record = readClientAuthRecord(clientId);
  if (!record) redirect('/admin/clients?error=1');
  const token = await createSessionToken(clientId, { sessionVersion: record.sessionVersion, scope: 'admin-impersonation' });
  jar.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 30 * 24 * 60 * 60, path: '/' });
  redirect('/client/dashboard');
}

export async function resetClientPinAction(formData: FormData) {
  const jar = await cookies();
  if (!await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '')) redirect('/admin/login?error=1&next=/admin/clients');
  const source = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`admin-reset:${hash(source)}`, { maxRequests: 5, windowMs: 15 * 60 * 1000 }).allowed) redirect('/admin/clients?error=reset-failed');
  const clientId = (formData.get('clientId') as string | null)?.trim() ?? '';
  const pin = (formData.get('pin') as string | null)?.trim() ?? '';
  const confirmation = (formData.get('confirmation') as string | null)?.trim() ?? '';
  if (pin !== confirmation || !validateClientPinPolicy(pin)) redirect('/admin/clients?error=reset-failed');
  const result = await resetClientPin(clientId, pin, { mustChangePin: true });
  if (!result) redirect('/admin/clients?error=reset-failed');
  appendClientSecurityAudit('admin-reset', { actorClass: 'admin', outcomeClass: 'allowed', target: clientId, source, sessionVersion: result.sessionVersion });
  redirect('/admin/clients?success=1');
}

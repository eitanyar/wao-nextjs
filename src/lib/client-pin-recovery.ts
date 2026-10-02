import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { appendClientSecurityAudit } from './client-security-audit';
import { beginClientRecoveryChallenge, cancelClientRecoveryChallenge, consumeClientRecoveryChallengeAndResetPin, markClientRecoveryChallengeDelivered, readClientAuthRecord, resolveConfiguredClientAuthRoot, type ClientRecoveryChallenge } from './client-auth-store';
import { validateClientPinPolicy } from './client-pin';
import { sendResendTransactionalEmail, type ResendTransactionalEmailInput, type ResendTransactionalEmailResult } from './notifications/resend-transactional';

const CLIENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
type EmailEnrollment = { emailCanonical: string; verifiedAt: string; enabled: true };
export interface ClientPinRecoveryDependencies {
  clientsRoot?: string; now?: () => Date; randomCode?: () => string; recoverySecret?: string;
  enabled?: boolean; sender?: string; auditRoot?: string;
  rateLimit?: (bucket: 'request-source' | 'request-source-subject' | 'complete-source-subject', source: string, subjectDigest: string) => boolean;
  sendEmail?: (input: ResendTransactionalEmailInput) => Promise<ResendTransactionalEmailResult>;
}
export type RecoveryRequest = { email: string; source: string };
export type RecoveryCompletion = RecoveryRequest & { code: string; newPin: string; confirmPin: string };

export function canonicalizeRecoveryEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || /[\s\x00-\x1f\x7f]/.test(email) || (email.match(/@/g) ?? []).length !== 1) return null;
  const [local, domain] = email.split('@');
  if (!local || !domain || !domain.includes('.') || domain.length > 253) return null;
  if (domain.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) return null;
  return email;
}
function validEnrollment(value: unknown): value is EmailEnrollment {
  if (!value || typeof value !== 'object') return false;
  const enrollment = value as Partial<EmailEnrollment>;
  return enrollment.enabled === true && canonicalizeRecoveryEmail(enrollment.emailCanonical) === enrollment.emailCanonical
    && typeof enrollment.verifiedAt === 'string' && !Number.isNaN(new Date(enrollment.verifiedAt).getTime());
}
function contained(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
export function resolveUniqueRecoveryEnrollmentByEmail(email: string, root: string): { clientId: string; emailCanonical: string } | null {
  const canonical = canonicalizeRecoveryEmail(email);
  if (!canonical) return null;
  try {
    const matches: Array<{ clientId: string; emailCanonical: string }> = [];
    for (const clientId of fs.readdirSync(root).sort()) {
      if (!CLIENT_ID_PATTERN.test(clientId)) continue;
      const recordPath = path.resolve(root, clientId, 'client.json');
      if (!contained(recordPath, root)) return null;
      const record: unknown = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
      if (!record || typeof record !== 'object' || (record as { clientId?: unknown }).clientId !== clientId) return null;
      const enrollment = (record as { clientPinRecoveryEmail?: unknown }).clientPinRecoveryEmail;
      if (validEnrollment(enrollment) && enrollment.emailCanonical === canonical) matches.push({ clientId, emailCanonical: canonical });
    }
    return matches.length === 1 ? matches[0] : null;
  } catch { return null; }
}
function hmac(secret: string, domain: string, ...values: string[]): string { return createHmac('sha256', secret).update([domain, ...values].join('\u0000')).digest('hex'); }
function sameDigest(left: string, right: string): boolean { return /^[a-f0-9]{64}$/.test(left) && /^[a-f0-9]{64}$/.test(right) && timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex')); }
function validCode(value: string): boolean { return /^\d{8}$/.test(value); }
function audit(event: 'recovery-request' | 'recovery-delivery' | 'recovery-denied' | 'recovery-limited' | 'recovery-reset', root: string | undefined, target: string, source: string, outcomeClass: 'allowed' | 'denied' | 'limited', sessionVersion?: number): boolean {
  try { appendClientSecurityAudit(event, { root, target, source, actorClass: 'client', outcomeClass, sessionVersion }); return true; } catch { return false; }
}
function defaults(dependencies: ClientPinRecoveryDependencies) {
  return {
    clientsRoot: path.resolve(dependencies.clientsRoot ?? resolveConfiguredClientAuthRoot() ?? path.join(process.cwd(), 'data', 'clients')),
    now: dependencies.now ?? (() => new Date()), randomCode: dependencies.randomCode ?? (() => String(randomInt(0, 100_000_000)).padStart(8, '0')),
    recoverySecret: dependencies.recoverySecret ?? process.env.CLIENT_PORTAL_SECRET ?? '', enabled: dependencies.enabled ?? process.env.CLIENT_PIN_RECOVERY_EMAIL_ENABLE === '1',
    sender: dependencies.sender ?? process.env.CLIENT_PIN_RECOVERY_EMAIL_FROM ?? '', auditRoot: dependencies.auditRoot, rateLimit: dependencies.rateLimit ?? (() => true), sendEmail: dependencies.sendEmail ?? sendResendTransactionalEmail,
  };
}

export async function requestClientPinRecovery(request: RecoveryRequest, dependencies: ClientPinRecoveryDependencies = {}): Promise<{ status: 'accepted' }> {
  const resolved = defaults(dependencies);
  const email = canonicalizeRecoveryEmail(request.email);
  const subjectRate = hmac(resolved.recoverySecret || 'unconfigured', 'wao-client-pin-recovery-rate-v1', email ?? 'invalid');
  const sourceRate = hmac(resolved.recoverySecret || 'unconfigured', 'wao-client-pin-recovery-source-rate-v1', request.source);
  if (!resolved.rateLimit('request-source', sourceRate, subjectRate) || !resolved.rateLimit('request-source-subject', sourceRate, subjectRate)) {
    audit('recovery-limited', resolved.auditRoot, subjectRate, sourceRate, 'limited');
    return { status: 'accepted' };
  }
  const enrollment = email ? resolveUniqueRecoveryEnrollmentByEmail(email, resolved.clientsRoot) : null;
  const auth = enrollment ? readClientAuthRecord(enrollment.clientId, resolved.clientsRoot) : null;
  const now = resolved.now();
  const delivered = auth?.recovery?.deliveredInLast24Hours?.filter(value => now.getTime() - new Date(value).getTime() < ONE_DAY_MS) ?? [];
  if (!resolved.enabled || !enrollment || !auth || !resolved.recoverySecret || !resolved.sender.trim() || (auth.recovery?.deliveredAt && now.getTime() - new Date(auth.recovery.deliveredAt).getTime() < ONE_MINUTE_MS) || delivered.length >= 5) {
    audit('recovery-denied', resolved.auditRoot, subjectRate, sourceRate, 'denied');
    return { status: 'accepted' };
  }
  const code = resolved.randomCode();
  if (!validCode(code)) return { status: 'accepted' };
  const subjectDigest = hmac(resolved.recoverySecret, 'wao-client-pin-recovery-email-subject-v1', enrollment.emailCanonical);
  const nonce = randomUUID();
  const challenge: ClientRecoveryChallenge = { id: randomUUID(), nonce, subjectDigest, digest: hmac(resolved.recoverySecret, 'wao-client-pin-recovery-code-v1', enrollment.clientId, subjectDigest, nonce, code), createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + TEN_MINUTES_MS).toISOString(), failedAttempts: 0, state: 'pending' };
  if (!await beginClientRecoveryChallenge(enrollment.clientId, challenge, resolved.clientsRoot) || !audit('recovery-request', resolved.auditRoot, subjectDigest, sourceRate, 'allowed')) {
    await cancelClientRecoveryChallenge(enrollment.clientId, challenge.id, resolved.now().toISOString(), resolved.clientsRoot);
    return { status: 'accepted' };
  }
  try {
    const result = await resolved.sendEmail({ to: enrollment.emailCanonical, from: resolved.sender, subject: 'WAO recovery code', text: `WAO recovery code: ${code}. Expires in 10 minutes.` });
    if (!result?.messageId?.trim()) throw new Error('delivery_failed');
    if (!await markClientRecoveryChallengeDelivered(enrollment.clientId, challenge.id, resolved.now().toISOString(), resolved.clientsRoot)) throw new Error('mark_failed');
    if (!audit('recovery-delivery', resolved.auditRoot, subjectDigest, sourceRate, 'allowed')) throw new Error('audit_failed');
  } catch { await cancelClientRecoveryChallenge(enrollment.clientId, challenge.id, resolved.now().toISOString(), resolved.clientsRoot); }
  return { status: 'accepted' };
}

export async function completeClientPinRecovery(request: RecoveryCompletion, dependencies: ClientPinRecoveryDependencies = {}): Promise<{ status: 'complete' | 'mismatch' | 'policy-failure' | 'invalid-or-expired' }> {
  const resolved = defaults(dependencies);
  if (request.newPin !== request.confirmPin) return { status: 'mismatch' };
  if (!validateClientPinPolicy(request.newPin)) return { status: 'policy-failure' };
  const email = canonicalizeRecoveryEmail(request.email);
  const rateSubject = hmac(resolved.recoverySecret || 'unconfigured', 'wao-client-pin-recovery-rate-v1', email ?? 'invalid');
  if (!resolved.enabled || !resolved.rateLimit('complete-source-subject', hmac(resolved.recoverySecret || 'unconfigured', 'source', request.source), rateSubject) || !validCode(request.code)) return { status: 'invalid-or-expired' };
  const enrollment = email ? resolveUniqueRecoveryEnrollmentByEmail(email, resolved.clientsRoot) : null;
  const auth = enrollment ? readClientAuthRecord(enrollment.clientId, resolved.clientsRoot) : null;
  const challenge = auth?.recovery?.challenge;
  if (!enrollment || !auth || !challenge || !resolved.recoverySecret) return { status: 'invalid-or-expired' };
  const subjectDigest = hmac(resolved.recoverySecret, 'wao-client-pin-recovery-email-subject-v1', enrollment.emailCanonical);
  const candidate = hmac(resolved.recoverySecret, 'wao-client-pin-recovery-code-v1', enrollment.clientId, subjectDigest, challenge.nonce, request.code);
  const result = await consumeClientRecoveryChallengeAndResetPin(enrollment.clientId, {
    challengeId: challenge.id, validDigest: sameDigest(challenge.digest, candidate), validSubject: sameDigest(challenge.subjectDigest, subjectDigest), now: resolved.now().toISOString(), newPin: request.newPin,
    requiredAudit: (sessionVersion) => audit('recovery-reset', resolved.auditRoot, subjectDigest, hmac(resolved.recoverySecret, 'source', request.source), 'allowed', sessionVersion),
  }, resolved.clientsRoot);
  return result.status === 'complete' ? { status: 'complete' } : { status: 'invalid-or-expired' };
}

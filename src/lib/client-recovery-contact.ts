import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { appendClientSecurityAudit } from './client-security-audit';
import { checkRateLimit } from './payments/rate-limit';
import { canonicalizeRecoveryEmail } from './client-pin-recovery';
import { sendResendTransactionalEmail, type ResendTransactionalEmailInput, type ResendTransactionalEmailResult } from './notifications/resend-transactional';
import {
  beginClientRecoveryContactVerification,
  cancelClientRecoveryContactVerification,
  consumeClientRecoveryContactVerification,
  markClientRecoveryContactVerificationDelivered,
  readClientAuthRecord,
  resolveConfiguredClientAuthRoot,
  type ClientRecoveryContactVerification,
} from './client-auth-store';

const CLIENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const TEN_MINUTES_MS = 10 * 60 * 1000;
type Enrollment = { emailCanonical: string; verifiedAt: string; enabled: true };
type ContactStatus = { status: 'disabled' | 'invalid' } | { status: 'verified'; maskedEmail: string; verifiedAt: string };
type RequestInput = { clientId: string; email: string };
type CompleteInput = RequestInput & { code: string };

export interface ClientRecoveryContactDependencies {
  clientsRoot?: string;
  now?: () => Date;
  randomCode?: () => string;
  recoverySecret?: string;
  sender?: string;
  source?: string;
  auditRoot?: string;
  rateLimit?: (bucket: 'request-source' | 'request-subject' | 'complete-subject' | 'reveal-target', digest: string) => boolean;
  sendEmail?: (input: ResendTransactionalEmailInput) => Promise<ResendTransactionalEmailResult>;
}

function rootFor(dependencies: ClientRecoveryContactDependencies): string {
  return path.resolve(dependencies.clientsRoot ?? resolveConfiguredClientAuthRoot() ?? path.join(process.cwd(), 'data', 'clients'));
}
function isContained(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
function validEnrollment(value: unknown): value is Enrollment {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<Enrollment>;
  return entry.enabled === true && canonicalizeRecoveryEmail(entry.emailCanonical) === entry.emailCanonical
    && typeof entry.verifiedAt === 'string' && !Number.isNaN(new Date(entry.verifiedAt).getTime());
}
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length === 1) return `*@${domain}`;
  return `${local[0]}${'*'.repeat(Math.max(1, local.length - 2))}${local.at(-1)}@${domain}`;
}
function hmac(secret: string, domain: string, ...values: string[]): string {
  return createHmac('sha256', secret).update([domain, ...values].join('\u0000')).digest('hex');
}
function sameDigest(left: string, right: string): boolean {
  return /^[a-f0-9]{64}$/.test(left) && /^[a-f0-9]{64}$/.test(right) && timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}
function validCode(value: string): boolean { return /^\d{8}$/.test(value); }
function scanClients(root: string): Map<string, Record<string, unknown>> | null {
  try {
    const result = new Map<string, Record<string, unknown>>();
    for (const clientId of fs.readdirSync(root).sort()) {
      if (!CLIENT_ID_PATTERN.test(clientId)) return null;
      const file = path.resolve(root, clientId, 'client.json');
      if (!isContained(file, root)) return null;
      const record: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!record || typeof record !== 'object' || (record as { clientId?: unknown }).clientId !== clientId) return null;
      result.set(clientId, record as Record<string, unknown>);
    }
    return result;
  } catch { return null; }
}
function hasCollision(records: Map<string, Record<string, unknown>>, clientId: string, email: string): boolean {
  return [...records.entries()].some(([id, record]) => id !== clientId && validEnrollment(record.clientPinRecoveryEmail) && record.clientPinRecoveryEmail.emailCanonical === email);
}
function writeClientRecord(root: string, clientId: string, record: Record<string, unknown>): boolean {
  const target = path.resolve(root, clientId, 'client.json');
  if (!isContained(target, root)) return false;
  const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    fs.renameSync(temporary, target);
    return true;
  } catch { fs.rmSync(temporary, { force: true }); return false; }
}
function audit(event: 'recovery-contact-request' | 'recovery-contact-delivery' | 'recovery-contact-verified' | 'recovery-contact-denied' | 'recovery-contact-reveal', root: string | undefined, target: string, source: string, outcomeClass: 'allowed' | 'denied' | 'limited'): boolean {
  try { appendClientSecurityAudit(event, { root, target, source, actorClass: 'admin', outcomeClass }); return true; } catch { return false; }
}
function defaults(dependencies: ClientRecoveryContactDependencies) {
  const secret = dependencies.recoverySecret ?? process.env.CLIENT_PORTAL_SECRET ?? '';
  return {
    root: rootFor(dependencies), secret, now: dependencies.now ?? (() => new Date()),
    randomCode: dependencies.randomCode ?? (() => String(randomInt(0, 100_000_000)).padStart(8, '0')),
    sender: dependencies.sender ?? process.env.CLIENT_PIN_RECOVERY_EMAIL_FROM ?? '', source: dependencies.source ?? 'unknown', auditRoot: dependencies.auditRoot,
    sendEmail: dependencies.sendEmail ?? sendResendTransactionalEmail,
    rateLimit: dependencies.rateLimit ?? ((bucket, value) => checkRateLimit(`admin-contact:${bucket}:${value}`, { maxRequests: bucket === 'reveal-target' ? 10 : 5, windowMs: 15 * 60 * 1000 }).allowed),
  };
}
function status(record: Record<string, unknown> | undefined): ContactStatus {
  if (!record || !Object.hasOwn(record, 'clientPinRecoveryEmail')) return { status: 'disabled' };
  const entry = record.clientPinRecoveryEmail;
  return validEnrollment(entry) ? { status: 'verified', maskedEmail: maskEmail(entry.emailCanonical), verifiedAt: entry.verifiedAt } : { status: 'invalid' };
}
export function getClientRecoveryContactStatus(clientId: string, root?: string): ContactStatus {
  return status(scanClients(path.resolve(root ?? resolveConfiguredClientAuthRoot() ?? path.join(process.cwd(), 'data', 'clients')))?.get(clientId));
}

export async function requestClientRecoveryContactVerification(input: RequestInput, dependencies: ClientRecoveryContactDependencies = {}): Promise<{ status: 'sent' | 'failed' | 'limited' }> {
  const resolved = defaults(dependencies);
  const email = canonicalizeRecoveryEmail(input.email);
  const sourceDigest = hmac(resolved.secret || 'unconfigured', 'wao-recovery-contact-source-rate-v1', resolved.source);
  const subjectDigest = hmac(resolved.secret || 'unconfigured', 'wao-recovery-contact-rate-v1', resolved.source, input.clientId, email ?? 'invalid');
  if (!resolved.rateLimit('request-source', sourceDigest) || !resolved.rateLimit('request-subject', subjectDigest)) {
    audit('recovery-contact-denied', resolved.auditRoot, hmac(resolved.secret || 'unconfigured', 'target', input.clientId), sourceDigest, 'limited');
    return { status: 'limited' };
  }
  const records = scanClients(resolved.root);
  const target = records?.get(input.clientId);
  const auth = readClientAuthRecord(input.clientId, resolved.root);
  if (!email || !records || !target || !auth || !resolved.secret || !resolved.sender.trim() || hasCollision(records, input.clientId, email)) {
    audit('recovery-contact-denied', resolved.auditRoot, hmac(resolved.secret || 'unconfigured', 'target', input.clientId), sourceDigest, 'denied');
    return { status: 'failed' };
  }
  const now = resolved.now();
  const code = resolved.randomCode();
  if (!validCode(code)) return { status: 'failed' };
  const nonce = randomUUID();
  const identity = hmac(resolved.secret, 'wao-recovery-contact-email-subject-v1', input.clientId, email);
  const challenge: ClientRecoveryContactVerification = { id: randomUUID(), nonce, subjectDigest: identity, codeDigest: hmac(resolved.secret, 'wao-recovery-contact-code-v1', input.clientId, identity, nonce, code), createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + TEN_MINUTES_MS).toISOString(), failedAttempts: 0, state: 'pending' };
  if (!await beginClientRecoveryContactVerification(input.clientId, challenge, resolved.root) || !audit('recovery-contact-request', resolved.auditRoot, identity, sourceDigest, 'allowed')) {
    await cancelClientRecoveryContactVerification(input.clientId, challenge.id, resolved.now().toISOString(), resolved.root);
    return { status: 'failed' };
  }
  try {
    const message = await resolved.sendEmail({ to: email, from: resolved.sender, subject: 'WAO recovery email verification', text: `WAO verification code: ${code}. Expires in 10 minutes.` });
    if (!message?.messageId?.trim()) throw new Error('delivery_failed');
    if (!await markClientRecoveryContactVerificationDelivered(input.clientId, challenge.id, resolved.now().toISOString(), resolved.root)) throw new Error('delivery_mark_failed');
    if (!audit('recovery-contact-delivery', resolved.auditRoot, identity, sourceDigest, 'allowed')) throw new Error('delivery_audit_failed');
    return { status: 'sent' };
  } catch {
    await cancelClientRecoveryContactVerification(input.clientId, challenge.id, resolved.now().toISOString(), resolved.root);
    return { status: 'failed' };
  }
}

export async function completeClientRecoveryContactVerification(input: CompleteInput, dependencies: ClientRecoveryContactDependencies = {}): Promise<{ status: 'complete' | 'failed' | 'limited' }> {
  const resolved = defaults(dependencies);
  const email = canonicalizeRecoveryEmail(input.email);
  const rateDigest = hmac(resolved.secret || 'unconfigured', 'wao-recovery-contact-complete-rate-v1', resolved.source, input.clientId, email ?? 'invalid');
  if (!resolved.rateLimit('complete-subject', rateDigest)) return { status: 'limited' };
  const records = scanClients(resolved.root);
  const target = records?.get(input.clientId);
  const auth = readClientAuthRecord(input.clientId, resolved.root);
  const challenge = auth?.recoveryContactVerification;
  const identity = email && resolved.secret ? hmac(resolved.secret, 'wao-recovery-contact-email-subject-v1', input.clientId, email) : '';
  const candidate = challenge && resolved.secret ? hmac(resolved.secret, 'wao-recovery-contact-code-v1', input.clientId, identity, challenge.nonce, input.code) : '';
  if (!records || !target || !auth || !challenge || !email || hasCollision(records, input.clientId, email)) {
    audit('recovery-contact-denied', resolved.auditRoot, identity || rateDigest, rateDigest, 'denied');
    return { status: 'failed' };
  }
  const result = await consumeClientRecoveryContactVerification(input.clientId, {
    challengeId: challenge.id, now: resolved.now().toISOString(), validSubject: sameDigest(challenge.subjectDigest, identity), validDigest: validCode(input.code) && sameDigest(challenge.codeDigest, candidate),
    replaceClientRecord: () => {
      const current = scanClients(resolved.root);
      const currentTarget = current?.get(input.clientId);
      if (!current || !currentTarget || hasCollision(current, input.clientId, email)) return false;
      return writeClientRecord(resolved.root, input.clientId, { ...currentTarget, clientPinRecoveryEmail: { emailCanonical: email, verifiedAt: resolved.now().toISOString(), enabled: true } });
    },
  }, resolved.root);
  if (result.status !== 'complete' || !audit('recovery-contact-verified', resolved.auditRoot, identity, rateDigest, 'allowed')) return { status: 'failed' };
  return { status: 'complete' };
}

export async function revealClientRecoveryContact(clientId: string, dependencies: ClientRecoveryContactDependencies = {}): Promise<string | null> {
  const resolved = defaults(dependencies);
  const target = hmac(resolved.secret || 'unconfigured', 'wao-recovery-contact-reveal-target-v1', clientId);
  if (!resolved.rateLimit('reveal-target', target)) return null;
  const record = scanClients(resolved.root)?.get(clientId);
  const current = status(record);
  if (current.status !== 'verified' || !audit('recovery-contact-reveal', resolved.auditRoot, target, hmac(resolved.secret || 'unconfigured', 'source', resolved.source), 'allowed')) return null;
  return (record?.clientPinRecoveryEmail as Enrollment).emailCanonical;
}

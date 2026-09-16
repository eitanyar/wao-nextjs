import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { appendClientSecurityAudit } from './client-security-audit';
import { checkRateLimit } from './payments/rate-limit';
import { normalizeIsraeliPhone, sendWhatsAppTemplate, type SendWhatsAppTemplateInput, type SendWhatsAppTemplateResult } from './notifications/whatsapp-cloud';
import { readClientAuthRecord, resolveClientAuthPath, resolveConfiguredClientAuthRoot, type ClientAuthRecord, type ClientRecoveryContactVerification } from './client-auth-store';

const CLIENT_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const E164 = /^9725\d{8}$/;
const TEN_MINUTES = 10 * 60 * 1000;
const CONTACT_LOCKS = new Map<string, Promise<void>>();

type Enrollment = { whatsappE164: string; verifiedAt: string; enabled: true };
type ContactStatus = { status: 'disabled' | 'invalid' } | { status: 'verified'; maskedMobile: string; verifiedAt: string };
type RequestInput = { clientId: string; whatsappMobile: string };
type CompleteInput = RequestInput & { code: string };

export interface ClientRecoveryContactDependencies {
  clientsRoot?: string;
  now?: () => Date;
  randomCode?: () => string;
  recoverySecret?: string;
  templateName?: string;
  templateLanguage?: string;
  source?: string;
  auditRoot?: string;
  rateLimit?: (bucket: 'request-source' | 'request-subject' | 'complete-subject' | 'reveal-target', digest: string) => boolean;
  sendTemplate?: (input: SendWhatsAppTemplateInput) => Promise<SendWhatsAppTemplateResult>;
}

function rootFor(dependencies: ClientRecoveryContactDependencies): string {
  return path.resolve(dependencies.clientsRoot ?? resolveConfiguredClientAuthRoot() ?? path.join(process.cwd(), 'data', 'clients'));
}
function iso(value: unknown): value is string { return typeof value === 'string' && !Number.isNaN(new Date(value).getTime()); }
function validEnrollment(value: unknown): value is Enrollment {
  if (!value || typeof value !== 'object') return false;
  const enrollment = value as Partial<Enrollment>;
  return enrollment.enabled === true && typeof enrollment.whatsappE164 === 'string' && E164.test(enrollment.whatsappE164) && iso(enrollment.verifiedAt);
}
function mask(mobile: string): string { return `${mobile.slice(0, 3)}******${mobile.slice(-2)}`; }
function digest(secret: string, domain: string, ...values: string[]): string { return createHmac('sha256', secret).update([domain, ...values].join('\u0000')).digest('hex'); }
function equalDigest(left: string, right: string): boolean {
  const leftValid = /^[a-f0-9]{64}$/.test(left);
  const rightValid = /^[a-f0-9]{64}$/.test(right);
  const a = leftValid ? Buffer.from(left, 'hex') : Buffer.alloc(32);
  const b = rightValid ? Buffer.from(right, 'hex') : Buffer.alloc(32);
  return leftValid && rightValid && timingSafeEqual(a, b);
}
function validCode(code: string): boolean { return /^\d{8}$/.test(code); }
function atomicJson(file: string, value: unknown): void {
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`);
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, file);
}
async function withLock<T>(root: string, clientId: string, operation: () => Promise<T>): Promise<T> {
  const key = `${root}:${clientId}`;
  const prior = CONTACT_LOCKS.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>(resolve => { release = resolve; });
  CONTACT_LOCKS.set(key, prior.then(() => current));
  await prior;
  try { return await operation(); } finally { release(); if (CONTACT_LOCKS.get(key) === current) CONTACT_LOCKS.delete(key); }
}
function recordPath(root: string, clientId: string): string | null {
  if (!CLIENT_ID.test(clientId)) return null;
  const file = path.resolve(root, clientId, 'client.json');
  return file.startsWith(`${root}${path.sep}`) ? file : null;
}
type Scan = { records: Map<string, Record<string, unknown>>; malformed: boolean };
function scan(root: string): Scan | null {
  let directories: fs.Dirent[];
  try { directories = fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name)); } catch { return null; }
  const records = new Map<string, Record<string, unknown>>();
  let malformed = false;
  for (const directory of directories) {
    if (!CLIENT_ID.test(directory.name)) { malformed = true; continue; }
    const file = recordPath(root, directory.name);
    try {
      const parsed: unknown = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
      if (!parsed || typeof parsed !== 'object' || (parsed as { clientId?: unknown }).clientId !== directory.name) malformed = true;
      else records.set(directory.name, parsed as Record<string, unknown>);
    } catch { malformed = true; }
  }
  return { records, malformed };
}
function defaults(dependencies: ClientRecoveryContactDependencies) {
  const secret = dependencies.recoverySecret ?? process.env.CLIENT_PORTAL_SECRET ?? '';
  return {
    root: rootFor(dependencies), secret, now: dependencies.now ?? (() => new Date()), randomCode: dependencies.randomCode ?? (() => String(randomInt(0, 100_000_000)).padStart(8, '0')),
    templateName: dependencies.templateName ?? process.env.WHATSAPP_CLIENT_RECOVERY_CONTACT_TEMPLATE ?? '', templateLanguage: dependencies.templateLanguage ?? process.env.WHATSAPP_CLIENT_RECOVERY_CONTACT_TEMPLATE_LANGUAGE ?? '',
    source: dependencies.source ?? 'unknown', auditRoot: dependencies.auditRoot,
    sendTemplate: dependencies.sendTemplate ?? sendWhatsAppTemplate,
    rateLimit: dependencies.rateLimit ?? ((bucket: 'request-source' | 'request-subject' | 'complete-subject' | 'reveal-target', value: string) => checkRateLimit(`admin-contact:${bucket}:${value}`, { maxRequests: bucket === 'reveal-target' ? 10 : bucket === 'complete-subject' ? 10 : 5, windowMs: 15 * 60 * 1000 }).allowed),
  };
}
function contactStatus(record: Record<string, unknown> | undefined): ContactStatus {
  if (!record || !Object.hasOwn(record, 'clientPinRecovery')) return { status: 'disabled' };
  const enrollment = record.clientPinRecovery;
  return validEnrollment(enrollment) ? { status: 'verified', maskedMobile: mask(enrollment.whatsappE164), verifiedAt: enrollment.verifiedAt } : { status: 'invalid' };
}
export function getClientRecoveryContactStatus(clientId: string, root?: string): ContactStatus {
  const selected = path.resolve(root ?? resolveConfiguredClientAuthRoot() ?? path.join(process.cwd(), 'data', 'clients'));
  const current = scan(selected);
  return contactStatus(current?.records.get(clientId));
}
function audit(event: 'recovery-contact-request' | 'recovery-contact-delivery' | 'recovery-contact-verified' | 'recovery-contact-denied' | 'recovery-contact-reveal', options: { root?: string; target: string; source: string; outcomeClass: 'allowed' | 'denied' | 'limited'; sessionVersion?: number }): boolean {
  try { appendClientSecurityAudit(event, { root: options.root, target: options.target, source: options.source, actorClass: 'admin', outcomeClass: options.outcomeClass, sessionVersion: options.sessionVersion }); return true; } catch { return false; }
}
function currentChallenge(record: ClientAuthRecord): ClientRecoveryContactVerification | null {
  const challenge = record.recoveryContactVerification;
  if (!challenge || !validCodeDigest(challenge.codeDigest) || !validCodeDigest(challenge.subjectDigest) || !/^[a-f0-9-]{36}$/.test(challenge.nonce) || !iso(challenge.createdAt) || !iso(challenge.expiresAt) || !Number.isInteger(challenge.failedAttempts) || (challenge.state !== 'pending' && challenge.state !== 'delivered')) return null;
  return challenge;
}
function validCodeDigest(value: unknown): value is string { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); }
function writeAuth(root: string, clientId: string, record: ClientAuthRecord): boolean {
  const file = resolveClientAuthPath(clientId, root);
  if (!file || !fs.existsSync(file)) return false;
  try { atomicJson(file, record); return true; } catch { return false; }
}

export async function requestClientRecoveryContactVerification(input: RequestInput, dependencies: ClientRecoveryContactDependencies = {}): Promise<{ status: 'sent' | 'failed' | 'limited' }> {
  const resolved = defaults(dependencies);
  const mobile = normalizeIsraeliPhone(input.whatsappMobile);
  const rateValue = digest(resolved.secret || 'unconfigured', 'wao-recovery-contact-rate-v1', resolved.source, input.clientId, mobile ?? 'invalid');
  if (!resolved.rateLimit('request-source', digest(resolved.secret || 'unconfigured', 'wao-recovery-contact-source-v1', resolved.source)) || !resolved.rateLimit('request-subject', rateValue)) return { status: 'limited' };
  return withLock(resolved.root, input.clientId, async () => {
    const all = scan(resolved.root);
    const target = all?.records.get(input.clientId);
    const collisions = mobile ? [...(all?.records ?? new Map()).entries()].filter(([id, record]) => id !== input.clientId && validEnrollment(record.clientPinRecovery) && record.clientPinRecovery.whatsappE164 === mobile) : [];
    const auth = readClientAuthRecord(input.clientId, resolved.root);
    if (!all || all.malformed || !target || !mobile || collisions.length || !auth || !resolved.secret || !resolved.templateName || !resolved.templateLanguage) { audit('recovery-contact-denied', { root: resolved.auditRoot, target: input.clientId, source: resolved.source, outcomeClass: 'denied' }); return { status: 'failed' }; }
    const now = resolved.now();
    const code = resolved.randomCode();
    if (!validCode(code)) return { status: 'failed' };
    const nonce = randomUUID();
    const subjectDigest = digest(resolved.secret, 'wao-recovery-contact-subject-v1', input.clientId, mobile);
    const challenge: ClientRecoveryContactVerification = { id: randomUUID(), nonce, subjectDigest, codeDigest: digest(resolved.secret, 'wao-recovery-contact-code-v1', input.clientId, subjectDigest, nonce, code), createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + TEN_MINUTES).toISOString(), failedAttempts: 0, state: 'pending' };
    if (!writeAuth(resolved.root, input.clientId, { ...auth, recoveryContactVerification: challenge, updatedAt: now.toISOString() })) return { status: 'failed' };
    if (!audit('recovery-contact-request', { root: resolved.auditRoot, target: input.clientId, source: resolved.source, outcomeClass: 'allowed', sessionVersion: auth.sessionVersion })) return { status: 'failed' };
    try {
      const provider = await resolved.sendTemplate({ to: mobile, templateName: resolved.templateName, templateLanguage: resolved.templateLanguage, bodyParameters: [code, '10'] });
      if (!provider?.messageId) throw new Error('provider');
      const latest = readClientAuthRecord(input.clientId, resolved.root);
      if (!latest || latest.recoveryContactVerification?.id !== challenge.id || !writeAuth(resolved.root, input.clientId, { ...latest, recoveryContactVerification: { ...challenge, state: 'delivered', deliveredAt: resolved.now().toISOString() }, updatedAt: resolved.now().toISOString() })) throw new Error('storage');
      if (!audit('recovery-contact-delivery', { root: resolved.auditRoot, target: input.clientId, source: resolved.source, outcomeClass: 'allowed', sessionVersion: auth.sessionVersion })) throw new Error('audit');
      return { status: 'sent' };
    } catch {
      const latest = readClientAuthRecord(input.clientId, resolved.root);
      if (latest?.recoveryContactVerification?.id === challenge.id) writeAuth(resolved.root, input.clientId, { ...latest, recoveryContactVerification: undefined, updatedAt: resolved.now().toISOString() });
      return { status: 'failed' };
    }
  });
}

export async function completeClientRecoveryContactVerification(input: CompleteInput, dependencies: ClientRecoveryContactDependencies = {}): Promise<{ status: 'complete' | 'failed' | 'limited' }> {
  const resolved = defaults(dependencies);
  const mobile = normalizeIsraeliPhone(input.whatsappMobile);
  const rateValue = digest(resolved.secret || 'unconfigured', 'wao-recovery-contact-rate-v1', resolved.source, input.clientId, mobile ?? 'invalid');
  if (!resolved.rateLimit('complete-subject', rateValue)) return { status: 'limited' };
  return withLock(resolved.root, input.clientId, async () => {
    const all = scan(resolved.root);
    const target = all?.records.get(input.clientId);
    const collisions = mobile ? [...(all?.records ?? new Map()).entries()].filter(([id, record]) => id !== input.clientId && validEnrollment(record.clientPinRecovery) && record.clientPinRecovery.whatsappE164 === mobile) : [];
    const auth = readClientAuthRecord(input.clientId, resolved.root);
    const challenge = auth ? currentChallenge(auth) : null;
    const now = resolved.now();
    const expectedSubject = mobile && resolved.secret ? digest(resolved.secret, 'wao-recovery-contact-subject-v1', input.clientId, mobile) : '';
    const expectedCode = challenge && resolved.secret ? digest(resolved.secret, 'wao-recovery-contact-code-v1', input.clientId, expectedSubject, challenge.nonce, input.code) : '';
    const valid = !!all && !all.malformed && !!target && !!mobile && !collisions.length && !!auth && !!challenge && challenge.state === 'delivered' && new Date(challenge.expiresAt).getTime() > now.getTime() && challenge.failedAttempts < 5 && validCode(input.code) && equalDigest(challenge.subjectDigest, expectedSubject) && equalDigest(challenge.codeDigest, expectedCode);
    if (!valid) {
      if (auth && challenge && challenge.state === 'delivered') writeAuth(resolved.root, input.clientId, { ...auth, recoveryContactVerification: challenge.failedAttempts + 1 >= 5 ? undefined : { ...challenge, failedAttempts: challenge.failedAttempts + 1 }, updatedAt: now.toISOString() });
      audit('recovery-contact-denied', { root: resolved.auditRoot, target: input.clientId, source: resolved.source, outcomeClass: 'denied', sessionVersion: auth?.sessionVersion });
      return { status: 'failed' };
    }
    if (!audit('recovery-contact-verified', { root: resolved.auditRoot, target: input.clientId, source: resolved.source, outcomeClass: 'allowed', sessionVersion: auth.sessionVersion })) return { status: 'failed' };
    const clientFile = recordPath(resolved.root, input.clientId);
    if (!clientFile) return { status: 'failed' };
    try {
      atomicJson(clientFile, { ...target, clientPinRecovery: { whatsappE164: mobile, verifiedAt: now.toISOString(), enabled: true } });
      if (!writeAuth(resolved.root, input.clientId, { ...auth, recovery: { ...auth.recovery, challenge: undefined }, recoveryContactVerification: undefined, updatedAt: now.toISOString() })) throw new Error('auth');
      return { status: 'complete' };
    } catch { return { status: 'failed' }; }
  });
}

export async function revealClientRecoveryContact(clientId: string, dependencies: ClientRecoveryContactDependencies = {}): Promise<string | null> {
  const resolved = defaults(dependencies);
  const rateValue = digest(resolved.secret || 'unconfigured', 'wao-recovery-contact-reveal-v1', resolved.source, clientId);
  if (!resolved.rateLimit('reveal-target', rateValue)) return null;
  const all = scan(resolved.root);
  const target = all?.records.get(clientId);
  const status = contactStatus(target);
  if (!target || all?.malformed || status.status !== 'verified' || !audit('recovery-contact-reveal', { root: resolved.auditRoot, target: clientId, source: resolved.source, outcomeClass: 'allowed' })) return null;
  return (target.clientPinRecovery as Enrollment).whatsappE164;
}

import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { beginClientRecoveryChallenge, cancelClientRecoveryChallenge, consumeClientRecoveryChallengeAndResetPin, markClientRecoveryChallengeDelivered, readClientAuthRecord, resolveConfiguredClientAuthRoot, type ClientRecoveryChallenge } from './client-auth-store';
import { validateClientPinPolicy } from './client-pin';
import { normalizeIsraeliPhone, sendWhatsAppTemplate, type SendWhatsAppTemplateInput, type SendWhatsAppTemplateResult } from './notifications/whatsapp-cloud';

const CLIENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const E164_PATTERN = /^9725\d{8}$/;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface ClientPinRecoveryDependencies {
  clientsRoot?: string;
  now?: () => Date;
  randomCode?: () => string;
  recoverySecret?: string;
  rateLimit?: (bucket: 'request-source' | 'request-source-subject' | 'complete-source-subject', source: string, subjectDigest: string) => boolean;
  templateName?: string;
  templateLanguage?: string;
  sendTemplate?: (input: SendWhatsAppTemplateInput) => Promise<SendWhatsAppTemplateResult>;
}

export type RecoveryRequest = { whatsappMobile: string; source: string };
export type RecoveryCompletion = RecoveryRequest & { code: string; newPin: string; confirmPin: string };

function defaults(dependencies: ClientPinRecoveryDependencies) {
  return {
    clientsRoot: path.resolve(dependencies.clientsRoot ?? resolveConfiguredClientAuthRoot() ?? path.join(process.cwd(), 'data', 'clients')),
    now: dependencies.now ?? (() => new Date()),
    randomCode: dependencies.randomCode ?? (() => String(randomInt(0, 100_000_000)).padStart(8, '0')),
    recoverySecret: dependencies.recoverySecret ?? process.env.CLIENT_PORTAL_SECRET ?? '',
    rateLimit: dependencies.rateLimit ?? (() => true),
    templateName: dependencies.templateName ?? process.env.WHATSAPP_CLIENT_PIN_RECOVERY_TEMPLATE ?? '',
    templateLanguage: dependencies.templateLanguage ?? process.env.WHATSAPP_CLIENT_PIN_RECOVERY_TEMPLATE_LANGUAGE ?? '',
    sendTemplate: dependencies.sendTemplate ?? sendWhatsAppTemplate,
  };
}

function isValidEnrollment(value: unknown): value is { whatsappE164: string; verifiedAt: string; enabled: true } {
  if (!value || typeof value !== 'object') return false;
  const enrollment = value as { whatsappE164?: unknown; verifiedAt?: unknown; enabled?: unknown };
  return enrollment.enabled === true && typeof enrollment.whatsappE164 === 'string' && E164_PATTERN.test(enrollment.whatsappE164)
    && typeof enrollment.verifiedAt === 'string' && !Number.isNaN(new Date(enrollment.verifiedAt).getTime());
}

function resolveUniqueRecoveryEnrollmentByWhatsappE164(whatsappMobile: string, root: string): { clientId: string; whatsappE164: string } | null {
  const canonical = normalizeIsraeliPhone(whatsappMobile);
  const matches: Array<{ clientId: string; whatsappE164: string }> = [];
  let directories: string[] = [];
  try { directories = fs.readdirSync(root).sort(); } catch { return null; }
  for (const clientId of directories) {
    if (!CLIENT_ID_PATTERN.test(clientId)) continue;
    const file = path.resolve(root, clientId, 'client.json');
    if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file)) continue;
    try {
      const record: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
      const client = record && typeof record === 'object' ? record as { clientId?: unknown; clientPinRecovery?: unknown } : null;
      const enrollment = client?.clientPinRecovery;
      if (canonical && client?.clientId === clientId && isValidEnrollment(enrollment) && enrollment.whatsappE164 === canonical) matches.push({ clientId, whatsappE164: enrollment.whatsappE164 });
    } catch { /* Invalid records are not eligible. */ }
  }
  return matches.length === 1 ? matches[0] : null;
}

function hmacDigest(secret: string, domain: string, ...values: string[]): string {
  return createHmac('sha256', secret).update([domain, ...values].join('\u0000')).digest('hex');
}
function subjectDigest(secret: string, whatsappE164: string): string {
  return hmacDigest(secret, 'wao-client-pin-recovery-subject-v1', whatsappE164);
}
function codeDigest(secret: string, clientId: string, subject: string, nonce: string, code: string): string {
  return hmacDigest(secret, 'wao-client-pin-recovery-code-v1', clientId, subject, nonce, code);
}
function sameDigest(left: string, right: string): boolean {
  const validLeft = /^[a-f0-9]{64}$/.test(left);
  const validRight = /^[a-f0-9]{64}$/.test(right);
  const a = validLeft ? Buffer.from(left, 'hex') : Buffer.alloc(32);
  const b = validRight ? Buffer.from(right, 'hex') : Buffer.alloc(32);
  return validLeft && validRight && timingSafeEqual(a, b);
}
function isValidCode(value: string): boolean { return /^\d{8}$/.test(value); }

export async function requestClientPinRecovery(request: RecoveryRequest, dependencies: ClientPinRecoveryDependencies = {}): Promise<{ status: 'accepted' }> {
  const resolved = defaults(dependencies);
  const normalized = normalizeIsraeliPhone(request.whatsappMobile);
  const rateSubject = hmacDigest(resolved.recoverySecret || 'unconfigured', 'wao-client-pin-recovery-rate-v1', normalized ?? 'invalid');
  if (!resolved.rateLimit('request-source', request.source, rateSubject) || !resolved.rateLimit('request-source-subject', request.source, rateSubject)) return { status: 'accepted' };
  const now = resolved.now();
  const enrollment = resolveUniqueRecoveryEnrollmentByWhatsappE164(request.whatsappMobile, resolved.clientsRoot);
  const auth = enrollment ? readClientAuthRecord(enrollment.clientId, resolved.clientsRoot) : null;
  const delivered = auth?.recovery?.deliveredInLast24Hours?.filter(value => now.getTime() - new Date(value).getTime() < ONE_DAY_MS) ?? [];
  if (!enrollment || !auth || !resolved.recoverySecret || !resolved.templateName || !resolved.templateLanguage || (auth.recovery?.deliveredAt && now.getTime() - new Date(auth.recovery.deliveredAt).getTime() < ONE_MINUTE_MS) || delivered.length >= 5) return { status: 'accepted' };
  const code = resolved.randomCode();
  if (!isValidCode(code)) return { status: 'accepted' };
  const nonce = randomUUID();
  const subject = subjectDigest(resolved.recoverySecret, enrollment.whatsappE164);
  const challenge: ClientRecoveryChallenge = { id: randomUUID(), nonce, subjectDigest: subject, digest: codeDigest(resolved.recoverySecret, enrollment.clientId, subject, nonce, code), createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + TEN_MINUTES_MS).toISOString(), failedAttempts: 0, state: 'pending' };
  if (!await beginClientRecoveryChallenge(enrollment.clientId, challenge, resolved.clientsRoot)) return { status: 'accepted' };
  try {
    const provider = await resolved.sendTemplate({ to: enrollment.whatsappE164, templateName: resolved.templateName, templateLanguage: resolved.templateLanguage, bodyParameters: [code, '10'] });
    if (!provider || typeof provider.messageId !== 'string' || !provider.messageId) throw new Error('invalid_provider_result');
    if (!await markClientRecoveryChallengeDelivered(enrollment.clientId, challenge.id, resolved.now().toISOString(), resolved.clientsRoot)) return { status: 'accepted' };
  } catch {
    await cancelClientRecoveryChallenge(enrollment.clientId, challenge.id, resolved.now().toISOString(), resolved.clientsRoot);
  }
  return { status: 'accepted' };
}

export async function completeClientPinRecovery(request: RecoveryCompletion, dependencies: ClientPinRecoveryDependencies = {}): Promise<{ status: 'complete' | 'mismatch' | 'policy-failure' | 'invalid-or-expired' }> {
  const resolved = defaults(dependencies);
  if (request.newPin !== request.confirmPin) return { status: 'mismatch' };
  if (!validateClientPinPolicy(request.newPin)) return { status: 'policy-failure' };
  const normalized = normalizeIsraeliPhone(request.whatsappMobile);
  const rateSubject = hmacDigest(resolved.recoverySecret || 'unconfigured', 'wao-client-pin-recovery-rate-v1', normalized ?? 'invalid');
  if (!resolved.rateLimit('complete-source-subject', request.source, rateSubject) || !isValidCode(request.code)) return { status: 'invalid-or-expired' };
  const enrollment = resolveUniqueRecoveryEnrollmentByWhatsappE164(request.whatsappMobile, resolved.clientsRoot);
  const auth = enrollment ? readClientAuthRecord(enrollment.clientId, resolved.clientsRoot) : null;
  const challenge = auth?.recovery?.challenge;
  if (!enrollment || !auth || !challenge || !resolved.recoverySecret) return { status: 'invalid-or-expired' };
  const currentSubject = subjectDigest(resolved.recoverySecret, enrollment.whatsappE164);
  const candidate = codeDigest(resolved.recoverySecret, enrollment.clientId, currentSubject, challenge.nonce, request.code);
  const result = await consumeClientRecoveryChallengeAndResetPin(enrollment.clientId, { challengeId: challenge.id, validDigest: sameDigest(challenge.digest, candidate), validSubject: sameDigest(challenge.subjectDigest, currentSubject), now: resolved.now().toISOString(), newPin: request.newPin }, resolved.clientsRoot);
  return result.status === 'complete' ? { status: 'complete' } : { status: 'invalid-or-expired' };
}

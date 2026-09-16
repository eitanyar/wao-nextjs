import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hashClientPin, verifyClientPin } from './client-pin';

export interface ClientAuthRecord {
  pinHash: string;
  sessionVersion: number;
  mustChangePin: boolean;
  createdAt: string;
  updatedAt: string;
  recovery?: ClientRecoveryControl;
  recoveryContactVerification?: ClientRecoveryContactVerification;
}

export interface ClientRecoveryChallenge {
  id: string;
  digest: string;
  subjectDigest: string;
  nonce: string;
  createdAt: string;
  expiresAt: string;
  failedAttempts: number;
  state: 'pending' | 'delivered';
  deliveredAt?: string;
}

export interface ClientRecoveryControl {
  challenge?: ClientRecoveryChallenge;
  deliveredAt?: string;
  deliveredInLast24Hours?: string[];
}

export interface ClientRecoveryContactVerification {
  id: string;
  nonce: string;
  subjectDigest: string;
  codeDigest: string;
  createdAt: string;
  expiresAt: string;
  failedAttempts: number;
  state: 'pending' | 'delivered';
  deliveredAt?: string;
}

export interface VerifyClientCredentialsResult {
  ok: boolean;
  clientId?: string;
  sessionVersion?: number;
  mustChangePin?: boolean;
  legacyMigrated?: boolean;
}

const DEFAULT_CLIENTS_ROOT = path.join(process.cwd(), 'data', 'clients');
const CLIENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DEV_FIXTURE_ROOT_PATTERN = /^wao-client-auth-ui-[A-Za-z0-9_-]{1,64}$/;
let dummyHashPromise: Promise<string> | undefined;
let testVerifyPin: typeof verifyClientPin | undefined;
const recoveryLocks = new Map<string, Promise<void>>();

export function configureClientAuthStoreForTests(options: { verifyPin?: typeof verifyClientPin } = {}): void {
  testVerifyPin = options.verifyPin;
  dummyHashPromise = undefined;
}

function isContained(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

export function resolveConfiguredClientAuthRoot(): string | null {
  if (process.env.NODE_ENV === 'production' || process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE !== '1') return null;
  const configuredRoot = process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT;
  if (!configuredRoot) return null;
  const resolvedRoot = path.resolve(configuredRoot);
  const temporaryRoot = path.resolve(os.tmpdir());
  if (!isContained(resolvedRoot, temporaryRoot) || !DEV_FIXTURE_ROOT_PATTERN.test(path.basename(resolvedRoot))) return null;
  return resolvedRoot;
}

function clientsRoot(root?: string): string {
  return path.resolve(root ?? resolveConfiguredClientAuthRoot() ?? DEFAULT_CLIENTS_ROOT);
}
function validClientId(clientId: string): boolean { return CLIENT_ID_PATTERN.test(clientId); }

export function resolveClientAuthPath(clientId: string, root?: string): string | null {
  if (!validClientId(clientId)) return null;
  const base = clientsRoot(root);
  const candidate = path.resolve(base, clientId, 'client-auth.json');
  return isContained(candidate, base) ? candidate : null;
}
function resolveClientRecordPath(clientId: string, root?: string): string | null {
  const authPath = resolveClientAuthPath(clientId, root);
  return authPath ? path.join(path.dirname(authPath), 'client.json') : null;
}
function tempPath(filePath: string): string {
  return path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`);
}
function writeTempJson(filePath: string, value: unknown): string {
  const temporary = tempPath(filePath);
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return temporary;
}
function atomicWriteJson(filePath: string, value: unknown): void { fs.renameSync(writeTempJson(filePath, value), filePath); }
function validRecord(value: unknown): value is ClientAuthRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<ClientAuthRecord>;
  return typeof record.pinHash === 'string' && Number.isInteger(record.sessionVersion) && (record.sessionVersion ?? 0) > 0
    && typeof record.mustChangePin === 'boolean' && typeof record.createdAt === 'string' && typeof record.updatedAt === 'string';
}

export function readClientAuthRecord(clientId: string, root?: string): ClientAuthRecord | null {
  const authPath = resolveClientAuthPath(clientId, root);
  if (!authPath || !fs.existsSync(authPath)) return null;
  try { const value: unknown = JSON.parse(fs.readFileSync(authPath, 'utf8')); return validRecord(value) ? value : null; } catch { return null; }
}
async function verifyPin(pin: string, encodedHash: string): Promise<boolean> { return (testVerifyPin ?? verifyClientPin)(pin, encodedHash); }
function hasWellFormedPinHash(pinHash: string): boolean { return /^scrypt-v1\$16384\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/.test(pinHash); }
async function dummyVerify(pin: string): Promise<void> { dummyHashPromise ??= hashClientPin('482951'); await verifyPin(pin, await dummyHashPromise); }
function newRecord(pinHash: string, mustChangePin: boolean, sessionVersion = 1): ClientAuthRecord {
  const now = new Date().toISOString();
  return { pinHash, sessionVersion, mustChangePin, createdAt: now, updatedAt: now };
}

export async function provisionClientAuth(clientId: string, pin: string, root?: string, options: { mustChangePin?: boolean } = {}): Promise<ClientAuthRecord> {
  const authPath = resolveClientAuthPath(clientId, root);
  if (!authPath) throw new Error('invalid_client_id');
  fs.mkdirSync(path.dirname(authPath), { recursive: true });
  if (fs.existsSync(authPath)) throw new Error('client_auth_exists');
  const record = newRecord(await hashClientPin(pin), options.mustChangePin === true);
  atomicWriteJson(authPath, record);
  return record;
}

function migrateLegacy(clientPath: string, authPath: string, legacy: Record<string, unknown>, record: ClientAuthRecord): void {
  const sanitized = { ...legacy };
  delete sanitized.pin;
  const authTemp = writeTempJson(authPath, record);
  const clientTemp = writeTempJson(clientPath, sanitized);
  try {
    fs.renameSync(authTemp, authPath);
    try { fs.renameSync(clientTemp, clientPath); } catch (error) {
      fs.rmSync(authPath, { force: true });
      throw error;
    }
  } finally {
    fs.rmSync(authTemp, { force: true });
    fs.rmSync(clientTemp, { force: true });
  }
}

export async function verifyClientCredentials(clientId: string, pin: string, root?: string): Promise<VerifyClientCredentialsResult> {
  const record = readClientAuthRecord(clientId, root);
  if (record) {
    if (!hasWellFormedPinHash(record.pinHash)) { await dummyVerify(pin); return { ok: false }; }
    const ok = await verifyPin(pin, record.pinHash);
    return ok ? { ok: true, clientId, sessionVersion: record.sessionVersion, mustChangePin: record.mustChangePin } : { ok: false };
  }
  const clientPath = resolveClientRecordPath(clientId, root);
  if (!clientPath || !fs.existsSync(clientPath)) { await dummyVerify(pin); return { ok: false }; }
  try {
    const legacy: unknown = JSON.parse(fs.readFileSync(clientPath, 'utf8'));
    if (!legacy || typeof legacy !== 'object' || typeof (legacy as { pin?: unknown }).pin !== 'string' || (legacy as { pin: string }).pin !== pin) {
      await dummyVerify(pin); return { ok: false };
    }
    const auth = newRecord(await hashClientPin(pin), true);
    migrateLegacy(clientPath, resolveClientAuthPath(clientId, root)!, legacy as Record<string, unknown>, auth);
    return { ok: true, clientId, sessionVersion: auth.sessionVersion, mustChangePin: true, legacyMigrated: true };
  } catch { await dummyVerify(pin); return { ok: false }; }
}

async function replaceExisting(clientId: string, pin: string, root: string | undefined, mustChangePin: boolean): Promise<ClientAuthRecord | null> {
  const authPath = resolveClientAuthPath(clientId, root);
  const existing = readClientAuthRecord(clientId, root);
  if (!authPath || !existing) return null;
  const next: ClientAuthRecord = { ...existing, pinHash: await hashClientPin(pin), sessionVersion: existing.sessionVersion + 1, mustChangePin, updatedAt: new Date().toISOString() };
  atomicWriteJson(authPath, next);
  return next;
}

export async function resetClientPin(clientId: string, pin: string, options: { mustChangePin?: boolean } = {}, root?: string): Promise<ClientAuthRecord | null> {
  const existing = readClientAuthRecord(clientId, root);
  if (existing) return replaceExisting(clientId, pin, root, options.mustChangePin !== false);
  const clientPath = resolveClientRecordPath(clientId, root);
  const authPath = resolveClientAuthPath(clientId, root);
  if (!clientPath || !authPath || !fs.existsSync(clientPath)) return null;
  try {
    const legacy: unknown = JSON.parse(fs.readFileSync(clientPath, 'utf8'));
    if (!legacy || typeof legacy !== 'object' || !Object.hasOwn(legacy, 'pin')) return null;
    const record = newRecord(await hashClientPin(pin), options.mustChangePin !== false);
    migrateLegacy(clientPath, authPath, legacy as Record<string, unknown>, record);
    return record;
  } catch { return null; }
}
export async function changeClientPin(clientId: string, pin: string, root?: string): Promise<ClientAuthRecord | null> { return replaceExisting(clientId, pin, root, false); }

async function withRecoveryLock<T>(clientId: string, root: string | undefined, operation: () => Promise<T>): Promise<T> {
  const key = `${clientsRoot(root)}:${clientId}`;
  const prior = recoveryLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  recoveryLocks.set(key, prior.then(() => current));
  await prior;
  try { return await operation(); } finally {
    release();
    if (recoveryLocks.get(key) === current) recoveryLocks.delete(key);
  }
}

function validRecoveryControl(value: unknown): value is ClientRecoveryControl {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  const control = value as ClientRecoveryControl;
  if (control.deliveredAt !== undefined && typeof control.deliveredAt !== 'string') return false;
  if (control.deliveredInLast24Hours !== undefined && (!Array.isArray(control.deliveredInLast24Hours) || !control.deliveredInLast24Hours.every(item => typeof item === 'string'))) return false;
  if (!control.challenge) return true;
  const challenge = control.challenge;
  return typeof challenge.id === 'string' && typeof challenge.digest === 'string' && typeof challenge.subjectDigest === 'string' && typeof challenge.nonce === 'string'
    && typeof challenge.createdAt === 'string' && typeof challenge.expiresAt === 'string' && Number.isInteger(challenge.failedAttempts)
    && (challenge.state === 'pending' || challenge.state === 'delivered') && (challenge.deliveredAt === undefined || typeof challenge.deliveredAt === 'string');
}

function recoveryRecord(record: ClientAuthRecord): boolean { return validRecoveryControl(record.recovery); }
function readUsableRecoveryRecord(clientId: string, root?: string): { path: string; record: ClientAuthRecord } | null {
  const authPath = resolveClientAuthPath(clientId, root);
  const record = readClientAuthRecord(clientId, root);
  return authPath && record && recoveryRecord(record) ? { path: authPath, record } : null;
}

export async function beginClientRecoveryChallenge(clientId: string, challenge: ClientRecoveryChallenge, root?: string): Promise<boolean> {
  return withRecoveryLock(clientId, root, async () => {
    const current = readUsableRecoveryRecord(clientId, root);
    if (!current) return false;
    const next: ClientAuthRecord = { ...current.record, recovery: { ...current.record.recovery, challenge }, updatedAt: challenge.createdAt };
    atomicWriteJson(current.path, next);
    return true;
  });
}

export async function markClientRecoveryChallengeDelivered(clientId: string, challengeId: string, now: string, root?: string): Promise<boolean> {
  return withRecoveryLock(clientId, root, async () => {
    const current = readUsableRecoveryRecord(clientId, root);
    const challenge = current?.record.recovery?.challenge;
    if (!current || !challenge || challenge.id !== challengeId || challenge.state !== 'pending') return false;
    const cutoff = new Date(new Date(now).getTime() - 24 * 60 * 60 * 1000).getTime();
    const deliveries = (current.record.recovery?.deliveredInLast24Hours ?? []).filter(value => new Date(value).getTime() >= cutoff);
    const recovery: ClientRecoveryControl = { challenge: { ...challenge, state: 'delivered', deliveredAt: now }, deliveredAt: now, deliveredInLast24Hours: [...deliveries, now] };
    atomicWriteJson(current.path, { ...current.record, recovery, updatedAt: now });
    return true;
  });
}

export async function cancelClientRecoveryChallenge(clientId: string, challengeId: string, now: string, root?: string): Promise<boolean> {
  return withRecoveryLock(clientId, root, async () => {
    const current = readUsableRecoveryRecord(clientId, root);
    if (!current || current.record.recovery?.challenge?.id !== challengeId) return false;
    atomicWriteJson(current.path, { ...current.record, recovery: { ...current.record.recovery, challenge: undefined }, updatedAt: now });
    return true;
  });
}

export async function consumeClientRecoveryChallengeAndResetPin(clientId: string, options: { challengeId: string; now: string; newPin: string; validDigest: boolean; validSubject: boolean }, root?: string): Promise<{ status: 'complete' | 'invalid-or-expired'; sessionVersion?: number }> {
  return withRecoveryLock(clientId, root, async () => {
    const current = readUsableRecoveryRecord(clientId, root);
    const challenge = current?.record.recovery?.challenge;
    if (!current || !challenge || challenge.id !== options.challengeId || challenge.state !== 'delivered' || new Date(challenge.expiresAt).getTime() <= new Date(options.now).getTime()) return { status: 'invalid-or-expired' };
    if (!options.validDigest || !options.validSubject || challenge.failedAttempts >= 5) {
      const failedAttempts = challenge.failedAttempts + 1;
      atomicWriteJson(current.path, { ...current.record, recovery: { ...current.record.recovery, challenge: failedAttempts >= 5 ? undefined : { ...challenge, failedAttempts } }, updatedAt: options.now });
      return { status: 'invalid-or-expired' };
    }
    const next = { ...current.record, pinHash: await hashClientPin(options.newPin), sessionVersion: current.record.sessionVersion + 1, mustChangePin: false, recovery: { ...current.record.recovery, challenge: undefined }, updatedAt: options.now };
    atomicWriteJson(current.path, next);
    return { status: 'complete', sessionVersion: next.sessionVersion };
  });
}

// Isolated candidate. Receipt means durable storage, not human acknowledgement.
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const controls = /[\x00-\x1f\x7f-\x9f]/;
const emailPattern = /^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
export type HelpErrorCode = 'invalid_input' | 'not_found' | 'conflict' | 'unavailable';
export class HelpRequestError extends Error {
  constructor(public readonly code: HelpErrorCode) { super(code); }
}
export interface NormalizedRequest {
  requestId: string; auditId: string; placeId: string; name: string;
  phone?: string; email?: string;
}
export interface HelpRequestRecord extends NormalizedRequest {
  schemaVersion: 1; displayName: string; receivedAt: string;
  consent: { accepted: true; purpose: 'sitebot-help'; receivedAt: string };
  status: 'received'; assignedTo: null;
}
export interface RequestStore {
  // Returns the durable winner, whether created here or by a concurrent caller.
  createIfAbsent(record: HelpRequestRecord): Promise<HelpRequestRecord>;
  read(requestId: string): Promise<HelpRequestRecord | null>;
  readDurable?(requestId: string): Promise<HelpRequestRecord | null>;
}
export interface HelpDependencies {
  clock(): Date;
  readAuditRecord(auditId: string): Promise<unknown>;
  store: RequestStore;
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function field(value: unknown, max: number, required: boolean): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || controls.test(value)) throw new HelpRequestError('invalid_input');
  const trimmed = value.trim();
  if (trimmed.length > max || (required && !trimmed)) throw new HelpRequestError('invalid_input');
  return trimmed || undefined;
}
export function normalizeHelpRequest(input: unknown): NormalizedRequest {
  if (!object(input) || Object.keys(input).some(k => !['requestId', 'auditId', 'placeId', 'name', 'phone', 'email', 'privacyAccepted'].includes(k)) || input.privacyAccepted !== true) {
    throw new HelpRequestError('invalid_input');
  }
  for (const key of ['requestId', 'auditId']) {
    if (typeof input[key] !== 'string' || !UUID.test(input[key])) throw new HelpRequestError('invalid_input');
  }
  const placeId = field(input.placeId, 256, true)!;
  // Place identity is opaque: do not silently change surrounding whitespace.
  if (placeId !== input.placeId) throw new HelpRequestError('invalid_input');
  const name = field(input.name, 120, true)!;
  const phone = field(input.phone, 40, false);
  const email = field(input.email, 254, false);
  if ((email && !emailPattern.test(email)) || (!phone && !email)) throw new HelpRequestError('invalid_input');
  return { requestId: (input.requestId as string).toLowerCase(), auditId: (input.auditId as string).toLowerCase(), placeId, name,
    ...(phone ? { phone } : {}), ...(email ? { email } : {}) };
}
function iso(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}
export function isHelpRequestRecord(value: unknown): value is HelpRequestRecord {
  try {
    if (!object(value) || Object.keys(value).some(k => !['schemaVersion', 'requestId', 'auditId', 'placeId', 'displayName', 'name', 'phone', 'email', 'receivedAt', 'consent', 'status', 'assignedTo'].includes(k))) return false;
    const normalized = normalizeHelpRequest({ requestId: value.requestId, auditId: value.auditId, placeId: value.placeId, name: value.name,
      ...(Object.hasOwn(value, 'phone') ? { phone: value.phone } : {}), ...(Object.hasOwn(value, 'email') ? { email: value.email } : {}), privacyAccepted: true });
    if (Object.entries(normalized).some(([k, v]) => value[k] !== v) || (Object.hasOwn(value, 'phone') && !normalized.phone) || (Object.hasOwn(value, 'email') && !normalized.email)) return false;
    return value.schemaVersion === 1 && typeof value.displayName === 'string' && !!value.displayName.trim() && !controls.test(value.displayName) &&
      iso(value.receivedAt) && value.status === 'received' && value.assignedTo === null && object(value.consent) &&
      Object.keys(value.consent).length === 3 && value.consent.accepted === true && value.consent.purpose === 'sitebot-help' && value.consent.receivedAt === value.receivedAt;
  } catch { return false; }
}
function identical(a: HelpRequestRecord, b: HelpRequestRecord): boolean {
  return (['requestId', 'auditId', 'placeId', 'displayName', 'name', 'phone', 'email'] as const).every(k => a[k] === b[k]);
}
export async function submitHelpRequest(input: unknown, deps: HelpDependencies): Promise<{ ok: true; requestId: string; status: 'received' }> {
  const normalized = normalizeHelpRequest(input);
  try {
    const now = deps.clock();
    const receivedAt = now.toISOString();
    const audit = await deps.readAuditRecord(normalized.auditId);
    if (!object(audit) || audit.auditId !== normalized.auditId || !iso(audit.fetchedAt) || !iso(audit.expiresAt) ||
      Date.parse(audit.fetchedAt) > now.getTime() || Date.parse(audit.expiresAt) <= now.getTime() || Date.parse(audit.fetchedAt) >= Date.parse(audit.expiresAt) || !Array.isArray(audit.candidates)) throw new HelpRequestError('not_found');
    const selected = audit.candidates.filter((c: unknown) => object(c) && c.placeId === normalized.placeId);
    if (selected.length !== 1 || !object(selected[0]) || typeof selected[0].displayName !== 'string' || !selected[0].displayName.trim() || controls.test(selected[0].displayName)) throw new HelpRequestError('not_found');
    const record: HelpRequestRecord = { schemaVersion: 1, ...normalized, displayName: selected[0].displayName, receivedAt,
      consent: { accepted: true, purpose: 'sitebot-help', receivedAt }, status: 'received', assignedTo: null };
    const winner = await deps.store.createIfAbsent(record);
    if (!isHelpRequestRecord(winner)) throw new HelpRequestError('unavailable');
    if (!identical(winner, record)) throw new HelpRequestError('conflict');
    return { ok: true, requestId: winner.requestId, status: 'received' };
  } catch (error) {
    if (error instanceof HelpRequestError) throw error;
    throw new HelpRequestError('unavailable');
  }
}

// Recovery is deliberately read-only; absence and mismatch have the same response.
export async function recoverHelpRequest(input: unknown, store: RequestStore): Promise<{ ok: true; requestId: string; status: 'received' }> {
  const normalized = normalizeHelpRequest(input);
  try {
    if (!store.readDurable) throw new HelpRequestError('unavailable');
    const existing = await store.readDurable(normalized.requestId);
    if (existing && !isHelpRequestRecord(existing)) throw new HelpRequestError('unavailable');
    if (!existing || !(['requestId', 'auditId', 'placeId', 'name', 'phone', 'email'] as const).every(k => existing[k] === normalized[k])) throw new HelpRequestError('not_found');
    return { ok: true, requestId: existing.requestId, status: 'received' };
  } catch (error) {
    if (error instanceof HelpRequestError) throw error;
    throw new HelpRequestError('unavailable');
  }
}

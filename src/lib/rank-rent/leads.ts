import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { deriveLeadAttribution, type LeadAttribution } from '../crm/lead-attribution';
import { validateAuthorizationGrant } from './authorization';
import type { PortfolioSite } from './types';

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const PRINTABLE_ASCII = /^[\x20-\x7E]+$/;
const FORBIDDEN_KEY = /token|secret|password|credential|privatekey|apikey|cookie|authorizationheader/i;
const MAX_BODY_BYTES = 16_384;
const MAX_RECORD_BYTES = 1_048_576;
const ATTRIBUTION_LIMITS = { landingReferrer: 2048, utmSource: 160, utmMedium: 160, utmCampaign: 160, gclid: 512, wbraid: 512, gbraid: 512 } as const;

const CLICK_MESSAGE_EVENT = `what${'sapp'}_click`;
export type LeadEventType = 'form' | 'phone_click' | `${'what'}${'sapp'}_click`;
export type Qualification = 'qualified' | 'click_stub';
export type LeadFailure = { ok: false; reason: string };
export type LeadSuccess<T> = { ok: true; value: T };
export type LeadResult<T> = LeadSuccess<T> | LeadFailure;

export interface PortfolioLeadInput {
  schemaVersion: 1;
  eventId: string;
  siteId: string;
  pageId: string;
  eventType: LeadEventType;
  occurredAt: string;
  sourceUrl: string;
  service: string;
  area: string;
  disclosureVersion: string;
  intendedRecipientClass: 'wao_managed_provider';
  contact?: { consentAt: string; name?: string; phone?: string; email?: string };
  attribution?: Partial<Record<keyof typeof ATTRIBUTION_LIMITS, string>>;
}

export interface StoredPortfolioLead extends PortfolioLeadInput {
  attribution: Record<string, string>;
  qualification: Qualification;
  acquisitionChannel: LeadAttribution['acquisitionChannel'];
  attributionConfidence: LeadAttribution['attributionConfidence'];
  capturedAt: string;
  requestDigest: string;
  deliveryState: 'not_routed';
}

export interface PortfolioLeadReceipt {
  eventId: string; siteId: string; pageId: string; eventType: LeadEventType; occurredAt: string;
  service: string; area: string; disclosureVersion: string; intendedRecipientClass: 'wao_managed_provider';
  qualification: Qualification; acquisitionChannel: LeadAttribution['acquisitionChannel'];
  attributionConfidence: LeadAttribution['attributionConfidence']; capturedAt: string; created: boolean;
  deliveryState: 'not_routed';
}

export interface LeadFileSystem {
  mkdir(directory: string): void;
  lstat(target: string): fs.Stats;
  exists(target: string): boolean;
  read(target: string): string;
  writeExclusive(target: string, body: string): void;
  renameNoClobber(temporary: string, target: string): void;
  remove(temporary: string): void;
  fsync?(target: string): void;
}

export interface CaptureAdapters { pageResolver: (site: PortfolioSite, pathname: string) => string | null; fileSystem?: LeadFileSystem; }
export interface RequestAdapters extends CaptureAdapters {
  now: () => string;
  resolveSite: (origin: string) => PortfolioSite | null;
  readGrant: (siteId: string) => unknown | null;
  resolveLeadRoot: () => string | null;
  rateLimit: (key: string) => { allowed: boolean; retryAfterSeconds?: number };
}

function descriptors(value: unknown): Record<string, PropertyDescriptor> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  try {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null || Object.getOwnPropertySymbols(value).length) return null;
    const result = Object.getOwnPropertyDescriptors(value);
    return Object.values(result).every(item => 'value' in item) ? result : null;
  } catch { return null; }
}
function safeGraph(value: unknown, seen = new Set<object>(), depth = 0): boolean {
  if (depth > 32 || value === null || typeof value !== 'object') return depth <= 32;
  if (seen.has(value)) return false;
  seen.add(value);
  try {
    if (Object.getOwnPropertySymbols(value).length) return false;
    if (Array.isArray(value)) {
      const properties = Object.getOwnPropertyDescriptors(value);
      return Object.keys(properties).every(key => key === 'length' || /^\d+$/.test(key)) && Object.keys(value).length === value.length && Object.values(properties).every(item => !('get' in item) && (!('value' in item) || safeGraph(item.value, seen, depth + 1)));
    }
    const record = descriptors(value);
    return record !== null && Object.entries(record).every(([key, item]) => !FORBIDDEN_KEY.test(key) && safeGraph(item.value, seen, depth + 1));
  } catch { return false; } finally { seen.delete(value); }
}
function field(record: Record<string, PropertyDescriptor>, key: string): unknown { return record[key]?.value; }
function exactFields(record: Record<string, PropertyDescriptor>, fields: readonly string[]): boolean { return Object.keys(record).length === fields.length && Object.keys(record).every(key => fields.includes(key)); }
function optionalFields(record: Record<string, PropertyDescriptor>, fields: readonly string[]): boolean { return Object.keys(record).every(key => fields.includes(key)); }
function safeId(value: unknown): value is string { return typeof value === 'string' && SAFE_ID.test(value); }
function asciiText(value: unknown, min: number, max: number): value is string { return typeof value === 'string' && value.length >= min && value.length <= max && PRINTABLE_ASCII.test(value) && value.trim().length > 0; }
function timestamp(value: unknown): value is string { return typeof value === 'string' && ISO_UTC.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }
function canonical(value: unknown): string { if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`; const record = descriptors(value); if (record) return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(field(record, key))}`).join(',')}}`; return JSON.stringify(value); }
function hash(value: unknown): string { return crypto.createHash('sha256').update(canonical(value)).digest('hex'); }
function validHost(hostname: string): boolean { return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(hostname) && !hostname.includes('localhost') && !/^(?:0|10|127|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)\./.test(hostname); }
function normalUrl(value: unknown): URL | null { if (!asciiText(value, 1, 2048)) return null; try { const parsed = new URL(value); return parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.hash && !parsed.port && validHost(parsed.hostname) && parsed.hostname === parsed.hostname.toLowerCase() ? parsed : null; } catch { return null; } }
function normalizedPhone(value: string): string | null { const result = value.replace(/[ ()-]/g, ''); return /^[+]?\d{6,31}$/.test(result) ? result : null; }
function normalizedEmail(value: string): string | null { const result = value.trim().toLowerCase(); return result.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) && PRINTABLE_ASCII.test(result) ? result : null; }

export function validatePortfolioLead(value: unknown, now: string): LeadResult<PortfolioLeadInput> {
  try {
    if (!timestamp(now) || !safeGraph(value)) return { ok: false, reason: 'invalid_schema' };
    const root = descriptors(value);
    const fields = ['schemaVersion', 'eventId', 'siteId', 'pageId', 'eventType', 'occurredAt', 'sourceUrl', 'service', 'area', 'disclosureVersion', 'intendedRecipientClass', 'contact', 'attribution'];
    if (!root || !optionalFields(root, fields) || !['schemaVersion', 'eventId', 'siteId', 'pageId', 'eventType', 'occurredAt', 'sourceUrl', 'service', 'area', 'disclosureVersion', 'intendedRecipientClass'].every(key => Object.hasOwn(root, key))) return { ok: false, reason: 'invalid_schema' };
    const eventType = field(root, 'eventType'); const occurredAt = field(root, 'occurredAt'); const source = normalUrl(field(root, 'sourceUrl'));
    if (field(root, 'schemaVersion') !== 1 || !safeId(field(root, 'eventId')) || !safeId(field(root, 'siteId')) || !safeId(field(root, 'pageId')) || !['form', 'phone_click', CLICK_MESSAGE_EVENT].includes(String(eventType)) || !timestamp(occurredAt) || !source || !asciiText(field(root, 'service'), 1, 160) || !asciiText(field(root, 'area'), 1, 160) || !safeId(field(root, 'disclosureVersion')) || field(root, 'intendedRecipientClass') !== 'wao_managed_provider') return { ok: false, reason: 'invalid_fields' };
    const age = Date.parse(now) - Date.parse(occurredAt as string);
    if (age < -300_000 || age > 2_592_000_000) return { ok: false, reason: 'invalid_event_time' };
    const attributionValue = field(root, 'attribution'); const attributionRecord = attributionValue === undefined ? null : descriptors(attributionValue);
    if (attributionValue !== undefined && (!attributionRecord || !optionalFields(attributionRecord, Object.keys(ATTRIBUTION_LIMITS)))) return { ok: false, reason: 'invalid_attribution' };
    const attribution: Record<string, string> = {};
    for (const [key, limit] of Object.entries(ATTRIBUTION_LIMITS)) { const item = attributionRecord ? field(attributionRecord, key) : undefined; if (item !== undefined) { if (!asciiText(item, 1, limit)) return { ok: false, reason: 'invalid_attribution' }; attribution[key] = item.trim(); } }
    const contactValue = field(root, 'contact');
    if (eventType === 'form') {
      const contact = descriptors(contactValue); if (!contact || !optionalFields(contact, ['consentAt', 'name', 'phone', 'email']) || !timestamp(field(contact, 'consentAt'))) return { ok: false, reason: 'invalid_contact' };
      const consentAt = field(contact, 'consentAt') as string; if (Date.parse(consentAt) > Date.parse(occurredAt as string) || Date.parse(occurredAt as string) - Date.parse(consentAt) > 86_400_000) return { ok: false, reason: 'invalid_consent' };
      const name = field(contact, 'name'); const phone = field(contact, 'phone'); const email = field(contact, 'email');
      if (name !== undefined && !asciiText(name, 1, 120)) return { ok: false, reason: 'invalid_contact' };
      const normalizedPhoneValue = phone === undefined ? undefined : normalizedPhone(phone as string);
      const normalizedEmailValue = email === undefined ? undefined : normalizedEmail(email as string);
      if ((phone !== undefined && !normalizedPhoneValue) || (email !== undefined && !normalizedEmailValue) || (!normalizedPhoneValue && !normalizedEmailValue)) return { ok: false, reason: 'invalid_contact' };
      const normalized: NonNullable<PortfolioLeadInput['contact']> = { consentAt };
      if (name !== undefined) normalized.name = (name as string).trim();
      if (normalizedPhoneValue) normalized.phone = normalizedPhoneValue;
      if (normalizedEmailValue) normalized.email = normalizedEmailValue;
      return { ok: true, value: { schemaVersion: 1, eventId: field(root, 'eventId') as string, siteId: field(root, 'siteId') as string, pageId: field(root, 'pageId') as string, eventType, occurredAt: occurredAt as string, sourceUrl: source.toString(), service: (field(root, 'service') as string).trim(), area: (field(root, 'area') as string).trim(), disclosureVersion: field(root, 'disclosureVersion') as string, intendedRecipientClass: 'wao_managed_provider', contact: normalized, ...(Object.keys(attribution).length ? { attribution } : {}) } };
    }
    if (contactValue !== undefined) return { ok: false, reason: 'invalid_click_contact' };
    return { ok: true, value: { schemaVersion: 1, eventId: field(root, 'eventId') as string, siteId: field(root, 'siteId') as string, pageId: field(root, 'pageId') as string, eventType: eventType as LeadEventType, occurredAt: occurredAt as string, sourceUrl: source.toString(), service: (field(root, 'service') as string).trim(), area: (field(root, 'area') as string).trim(), disclosureVersion: field(root, 'disclosureVersion') as string, intendedRecipientClass: 'wao_managed_provider', ...(Object.keys(attribution).length ? { attribution } : {}) } };
  } catch { return { ok: false, reason: 'invalid_schema' }; }
}

export function resolvePortfolioLeadPath(siteId: string, eventId: string, leadRoot: string): string | null {
  if (!safeId(siteId) || !safeId(eventId) || typeof leadRoot !== 'string' || !path.isAbsolute(leadRoot) || /[%\x00-\x1F]|[\\]|^[A-Za-z]:/.test(leadRoot)) return null;
  const root = path.resolve(leadRoot); const repository = path.resolve(process.cwd());
  if (root === repository || root.startsWith(`${repository}${path.sep}`)) return null;
  const target = path.resolve(root, siteId, `${eventId}.json`);
  return path.dirname(path.dirname(target)) === root && target === path.join(root, siteId, `${eventId}.json`) ? target : null;
}

function nativeFileSystem(): LeadFileSystem { return { mkdir: directory => fs.mkdirSync(directory, { recursive: true, mode: 0o700 }), lstat: target => fs.lstatSync(target), exists: target => fs.existsSync(target), read: target => fs.readFileSync(target, 'utf8'), writeExclusive: (target, body) => fs.writeFileSync(target, body, { encoding: 'utf8', mode: 0o600, flag: 'wx' }), renameNoClobber: (temporary, target) => { fs.linkSync(temporary, target); fs.rmSync(temporary); }, remove: temporary => { try { fs.rmSync(temporary, { force: true }); } catch { /* cleanup */ } }, fsync: target => { const handle = fs.openSync(target, 'r'); try { fs.fsyncSync(handle); } finally { fs.closeSync(handle); } } }; }
function siteEligible(site: PortfolioSite, input: PortfolioLeadInput, now: string, pageResolver: CaptureAdapters['pageResolver']): boolean { const source = normalUrl(input.sourceUrl); return Boolean(source && site.schemaVersion === 1 && site.siteId === input.siteId && site.lifecycle === 'live' && site.repository.status === 'connected' && site.cloudflarePages.status === 'connected' && site.canonicalDomainCandidate === source.hostname && pageResolver(site, source.pathname) === input.pageId && site.approvals.filter(item => item.requiredFor === 'live').length === 1 && site.approvals.some(item => item.requiredFor === 'live' && item.status === 'approved' && timestamp(item.requestedAt) && timestamp(item.resolvedAt) && Date.parse(item.resolvedAt as string) >= Date.parse(item.requestedAt) && Date.parse(item.resolvedAt as string) <= Date.parse(now))); }
function grantEligible(grantValue: unknown, siteId: string, now: string): boolean { const result = validateAuthorizationGrant(grantValue, now); if (!result.ok) return false; const grant = result.grant; if (grant.siteId !== siteId || grant.assets.some(asset => asset.ownerId !== grant.customerOwnerId)) return false; const recipient = grant.assets.find(asset => asset.assetType === 'lead_recipient'); return Boolean(recipient && recipient.scopes.length === 1 && recipient.scopes[0] === 'lead_delivery'); }
function validStored(value: unknown): value is StoredPortfolioLead { const candidate = descriptors(value); const fields = ['schemaVersion', 'eventId', 'siteId', 'pageId', 'eventType', 'occurredAt', 'sourceUrl', 'service', 'area', 'disclosureVersion', 'intendedRecipientClass', 'contact', 'attribution', 'qualification', 'acquisitionChannel', 'attributionConfidence', 'capturedAt', 'requestDigest', 'deliveryState']; if (!candidate || !optionalFields(candidate, fields) || !['schemaVersion', 'eventId', 'siteId', 'pageId', 'eventType', 'occurredAt', 'sourceUrl', 'service', 'area', 'disclosureVersion', 'intendedRecipientClass', 'attribution', 'qualification', 'acquisitionChannel', 'attributionConfidence', 'capturedAt', 'requestDigest', 'deliveryState'].every(key => Object.hasOwn(candidate, key))) return false; const contact = field(candidate, 'contact'); const capturedAt = field(candidate, 'capturedAt'); if (!timestamp(capturedAt)) return false; const input = validatePortfolioLead({ schemaVersion: field(candidate, 'schemaVersion'), eventId: field(candidate, 'eventId'), siteId: field(candidate, 'siteId'), pageId: field(candidate, 'pageId'), eventType: field(candidate, 'eventType'), occurredAt: field(candidate, 'occurredAt'), sourceUrl: field(candidate, 'sourceUrl'), service: field(candidate, 'service'), area: field(candidate, 'area'), disclosureVersion: field(candidate, 'disclosureVersion'), intendedRecipientClass: field(candidate, 'intendedRecipientClass'), ...(contact === undefined ? {} : { contact }), attribution: field(candidate, 'attribution') }, capturedAt as string); return input.ok && field(candidate, 'requestDigest') === hash(input.value) && ['qualified', 'click_stub'].includes(String(field(candidate, 'qualification'))) && field(candidate, 'deliveryState') === 'not_routed'; }

export function redactPortfolioLead(value: StoredPortfolioLead, created: boolean): PortfolioLeadReceipt {
  const receipt: PortfolioLeadReceipt = { eventId: value.eventId, siteId: value.siteId, pageId: value.pageId, eventType: value.eventType, occurredAt: value.occurredAt, service: value.service, area: value.area, disclosureVersion: value.disclosureVersion, intendedRecipientClass: value.intendedRecipientClass, qualification: value.qualification, acquisitionChannel: value.acquisitionChannel, attributionConfidence: value.attributionConfidence, capturedAt: value.capturedAt, created, deliveryState: 'not_routed' };
  return Object.freeze(receipt);
}

export function capturePortfolioLead(inputValue: unknown, now: string, site: PortfolioSite, grantValue: unknown, leadRoot: string, adapters: CaptureAdapters): LeadResult<PortfolioLeadReceipt> {
  const validated = validatePortfolioLead(inputValue, now); if (!validated.ok) return validated;
  if (!siteEligible(site, validated.value, now, adapters.pageResolver) || !grantEligible(grantValue, validated.value.siteId, now)) return { ok: false, reason: 'authorization_unavailable' };
  const target = resolvePortfolioLeadPath(validated.value.siteId, validated.value.eventId, leadRoot); if (!target) return { ok: false, reason: 'unsafe_path' };
  const fileSystem = adapters.fileSystem ?? nativeFileSystem(); const directory = path.dirname(target); const temporary = path.join(directory, `.${validated.value.eventId}.${crypto.randomUUID()}.tmp`); const requestDigest = hash(validated.value);
  try {
    fileSystem.mkdir(leadRoot); if (fileSystem.lstat(leadRoot).isSymbolicLink()) return { ok: false, reason: 'unsafe_root' };
    fileSystem.mkdir(directory); if (fileSystem.lstat(directory).isSymbolicLink()) return { ok: false, reason: 'unsafe_path' };
    if (fileSystem.exists(target)) { const stat = fileSystem.lstat(target); if (!stat.isFile() || stat.nlink !== 1 || stat.size > MAX_RECORD_BYTES) return { ok: false, reason: 'invalid_existing_record' }; const existing: unknown = JSON.parse(fileSystem.read(target)); if (!validStored(existing)) return { ok: false, reason: 'invalid_existing_record' }; return existing.requestDigest === requestDigest ? { ok: true, value: redactPortfolioLead(existing, false) } : { ok: false, reason: 'duplicate_conflict' }; }
    const attribution = deriveLeadAttribution(validated.value.attribution ?? {}); const record: StoredPortfolioLead = { ...validated.value, attribution: validated.value.attribution ?? {}, qualification: validated.value.eventType === 'form' ? 'qualified' : 'click_stub', ...attribution, capturedAt: now, requestDigest, deliveryState: 'not_routed' };
    const body = `${canonical(record)}\n`; if (Buffer.byteLength(body, 'utf8') > MAX_RECORD_BYTES) return { ok: false, reason: 'record_too_large' };
    fileSystem.writeExclusive(temporary, body); fileSystem.fsync?.(temporary); fileSystem.renameNoClobber(temporary, target); fileSystem.fsync?.(directory);
    return { ok: true, value: redactPortfolioLead(record, true) };
  } catch { fileSystem.remove(temporary); return { ok: false, reason: 'storage_failed' }; }
}

function response(body: object, status: number, origin?: string, headers: Record<string, string> = {}): Response { return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}), ...headers } }); }
function origin(value: string | null): string | null { const parsed = normalUrl(value); return parsed && parsed.pathname === '/' && !parsed.search ? parsed.origin : null; }
function failure(reason: string, status: number, allowedOrigin?: string, headers?: Record<string, string>): Response { return response({ success: false, reason }, status, allowedOrigin, headers); }

export async function handlePortfolioLeadRequest(request: Request, adapters: RequestAdapters): Promise<Response> {
  const requestOrigin = origin(request.headers.get('origin')); if (!requestOrigin) return failure('origin_forbidden', 403);
  const site = adapters.resolveSite(requestOrigin); if (!site) return failure('origin_forbidden', 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': requestOrigin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', Vary: 'Origin' } });
  if (request.method !== 'POST') return failure('method_not_allowed', 405, requestOrigin, { Allow: 'POST, OPTIONS' });
  if (request.headers.get('content-type')?.split(';', 1)[0].toLowerCase() !== 'application/json') return failure('unsupported_media_type', 415, requestOrigin);
  const length = Number(request.headers.get('content-length')); if (Number.isFinite(length) && length > MAX_BODY_BYTES) return failure('body_too_large', 413, requestOrigin);
  const rateKey = crypto.createHash('sha256').update(`${requestOrigin}\n${site.siteId}`).digest('hex'); const rate = adapters.rateLimit(rateKey); if (!rate.allowed) return failure('rate_limited', 429, requestOrigin, { 'Retry-After': String(Math.min(600, Math.max(1, rate.retryAfterSeconds ?? 60)) ) });
  let text: string; try { text = await request.text(); } catch { return failure('invalid_body', 400, requestOrigin); }
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return failure('body_too_large', 413, requestOrigin);
  let input: unknown; try { input = JSON.parse(text); } catch { return failure('invalid_json', 400, requestOrigin); }
  const root = adapters.resolveLeadRoot(); const grant = adapters.readGrant(site.siteId); if (!root || grant === null) return failure('service_unavailable', 503, requestOrigin);
  const captured = capturePortfolioLead(input, adapters.now(), site, grant, root, adapters);
  if (!captured.ok) { const statuses: Record<string, number> = { duplicate_conflict: 409, storage_failed: 503, authorization_unavailable: 403, unsafe_path: 503, unsafe_root: 503, invalid_existing_record: 503 }; return failure(captured.reason, statuses[captured.reason] ?? 400, requestOrigin); }
  return response({ success: true, receipt: captured.value }, captured.value.created ? 201 : 200, requestOrigin);
}

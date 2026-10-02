/**
 * Strict customer-owned asset authorization and append-only evidence ledger.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const AUTHORIZATION_SCHEMA_VERSION = 1 as const;
export const ASSET_TYPES = ['domain_dns', 'git_repository', 'cloudflare_pages', 'analytics', 'search_console', 'google_business_profile', 'content_media_rights', 'lead_recipient'] as const;
export const EXIT_STEPS = ['data_export_or_deletion_decision', 'permissions_released', 'git_role_released', 'cloudflare_role_released', 'gbp_role_released', 'tracking_removal_decision', 'lead_routing_stopped', 'owner_exit_acknowledged'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];
export type ExitStep = (typeof EXIT_STEPS)[number];
export type AuthorizationEventType = 'grant_recorded' | 'scope_changed' | 'asset_contested' | 'asset_restored' | 'grant_revoked' | 'exit_step_acknowledged';
export interface AuthorizationAsset { assetType: AssetType; assetId: string; ownerId: string; managerId: 'wao'; scopes: string[]; evidenceDigest: string; }
export interface AuthorizationGrant { schemaVersion: typeof AUTHORIZATION_SCHEMA_VERSION; grantId: string; siteId: string; customerOwnerId: string; managerId: 'wao'; processingPurpose: string; grantedAt: string; expiresAt: string; ownerAcknowledgedAt: string; assets: AuthorizationAsset[]; }
export interface AuthorizationEventInput { eventId: string; grantId: string; type: AuthorizationEventType; occurredAt: string; actorRef: string; assetType?: AssetType; exitStep?: ExitStep; }
export interface StoredAuthorizationEvent extends AuthorizationEventInput { previousEventDigest: string; eventDigest: string; }
export interface AuthorizationLedger { schemaVersion: typeof AUTHORIZATION_SCHEMA_VERSION; grantId: string; events: StoredAuthorizationEvent[]; }
export type AuthorizationValidation = { ok: true; grant: AuthorizationGrant } | { ok: false; reason: string };
export type LedgerResult = { ok: true; ledger: AuthorizationLedger } | { ok: false; reason: string };
export interface AssetControlState { state: 'customer_controlled' | 'held' | 'expired' | 'revoked'; reasons: string[]; affectedAssetTypes: AssetType[]; }
export interface ExitChecklistItem { exitStep: ExitStep; state: 'pending' | 'acknowledged'; eventId?: string; occurredAt?: string; affectedAssetTypes: AssetType[]; }

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ZERO_DIGEST = '0'.repeat(64);
const MAX_TEXT = 256;
const MAX_BYTES = 1024 * 1024;
const MAX_DEPTH = 32;
const FORBIDDEN_KEY = /token|secret|password|credential|privatekey|apikey|cookie|authorizationheader/i;
const SCOPES: Readonly<Record<AssetType, readonly string[]>> = {
  domain_dns: ['dns_read', 'dns_edit'], git_repository: ['repository_read', 'repository_write'], cloudflare_pages: ['pages_read', 'pages_deploy'], analytics: ['analytics_read'], search_console: ['search_console_read'], google_business_profile: ['gbp_read', 'gbp_manage'], content_media_rights: ['content_use'], lead_recipient: ['lead_delivery'],
};

function descriptors(value: unknown): Record<string, PropertyDescriptor> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  try {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return null;
    if (Object.getOwnPropertySymbols(value).length > 0) return null;
    const result = Object.getOwnPropertyDescriptors(value);
    return Object.values(result).every(item => 'value' in item) ? result : null;
  } catch { return null; }
}

function safeGraph(value: unknown, seen = new Set<object>(), depth = 0): boolean {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') return depth <= MAX_DEPTH;
  if (seen.has(value)) return false;
  seen.add(value);
  try {
    if (Object.getOwnPropertySymbols(value).length > 0) return false;
    if (Array.isArray(value)) {
      const items = Object.getOwnPropertyDescriptors(value);
      return Object.entries(items).every(([key, item]) => (key === 'length' || /^\d+$/.test(key)) && 'value' in item && safeGraph(item.value, seen, depth + 1));
    }
    const fields = descriptors(value);
    return fields !== null && Object.entries(fields).every(([key, field]) => !FORBIDDEN_KEY.test(key) && safeGraph(field.value, seen, depth + 1));
  } catch { return false; }
  finally { seen.delete(value); }
}

function field(record: Record<string, PropertyDescriptor>, name: string): unknown { return record[name]?.value; }
function hasOnly(record: Record<string, PropertyDescriptor>, fields: readonly string[]): boolean { return Object.keys(record).every(key => fields.includes(key)); }
function text(value: unknown, max = MAX_TEXT): value is string { return typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u001F\u007F-\u009F]/u.test(value); }
function nonblankText(value: unknown, max = MAX_TEXT): value is string { return text(value, max) && value.trim().length > 0; }
function timestamp(value: unknown): value is string {
  if (!text(value, 64) || !ISO_UTC.test(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}
function safeId(value: unknown): value is string { return typeof value === 'string' && SAFE_ID.test(value); }
function assetType(value: unknown): value is AssetType { return typeof value === 'string' && ASSET_TYPES.includes(value as AssetType); }
function exitStep(value: unknown): value is ExitStep { return typeof value === 'string' && EXIT_STEPS.includes(value as ExitStep); }
function sortedUnique(values: unknown, allowed: readonly string[]): values is string[] { return Array.isArray(values) && values.length > 0 && values.every(item => text(item)) && values.every((item, index) => allowed.includes(item) && (index === 0 || values[index - 1] < item)); }

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = descriptors(value);
  if (record) return `{${Object.keys(record).filter(key => field(record, key) !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonical(field(record, key))}`).join(',')}}`;
  return JSON.stringify(value);
}
function digest(event: Omit<StoredAuthorizationEvent, 'eventDigest'>): string { return crypto.createHash('sha256').update(canonical(event)).digest('hex'); }

function validAsset(value: unknown, owner: string): value is AuthorizationAsset {
  const record = descriptors(value);
  if (!record || !hasOnly(record, ['assetType', 'assetId', 'ownerId', 'managerId', 'scopes', 'evidenceDigest'])) return false;
  const type = field(record, 'assetType');
  return assetType(type) && safeId(field(record, 'assetId')) && field(record, 'ownerId') === owner && field(record, 'managerId') === 'wao' && sortedUnique(field(record, 'scopes'), SCOPES[type]) && typeof field(record, 'evidenceDigest') === 'string' && DIGEST.test(field(record, 'evidenceDigest') as string);
}

function grantCore(value: unknown, now: string, enforceCurrentExpiry: boolean): AuthorizationValidation {
  if (!safeGraph(value) || !timestamp(now)) return { ok: false, reason: 'invalid_schema' };
  const record = descriptors(value);
  if (!record || !hasOnly(record, ['schemaVersion', 'grantId', 'siteId', 'customerOwnerId', 'managerId', 'processingPurpose', 'grantedAt', 'expiresAt', 'ownerAcknowledgedAt', 'assets'])) return { ok: false, reason: 'invalid_schema' };
  const owner = field(record, 'customerOwnerId'); const assets = field(record, 'assets');
  if (field(record, 'schemaVersion') !== AUTHORIZATION_SCHEMA_VERSION || !safeId(field(record, 'grantId')) || !safeId(field(record, 'siteId')) || !safeId(owner) || owner === 'wao' || field(record, 'managerId') !== 'wao' || !nonblankText(field(record, 'processingPurpose')) || !timestamp(field(record, 'grantedAt')) || !timestamp(field(record, 'expiresAt')) || !timestamp(field(record, 'ownerAcknowledgedAt')) || !Array.isArray(assets)) return { ok: false, reason: 'invalid_fields' };
  if (Date.parse(field(record, 'ownerAcknowledgedAt') as string) < Date.parse(field(record, 'grantedAt') as string) || Date.parse(field(record, 'expiresAt') as string) <= Date.parse(field(record, 'grantedAt') as string) || (enforceCurrentExpiry && Date.parse(field(record, 'expiresAt') as string) <= Date.parse(now))) return { ok: false, reason: 'invalid_dates' };
  if (assets.length !== ASSET_TYPES.length || !assets.every(asset => validAsset(asset, owner))) return { ok: false, reason: 'invalid_assets' };
  const typedAssets = assets as AuthorizationAsset[];
  if (new Set(typedAssets.map(asset => asset.assetType)).size !== ASSET_TYPES.length || new Set(typedAssets.map(asset => asset.assetId)).size !== ASSET_TYPES.length || !ASSET_TYPES.every(type => typedAssets.some(asset => asset.assetType === type))) return { ok: false, reason: 'duplicate_or_missing_assets' };
  return { ok: true, grant: { schemaVersion: 1, grantId: field(record, 'grantId') as string, siteId: field(record, 'siteId') as string, customerOwnerId: owner, managerId: 'wao', processingPurpose: field(record, 'processingPurpose') as string, grantedAt: field(record, 'grantedAt') as string, expiresAt: field(record, 'expiresAt') as string, ownerAcknowledgedAt: field(record, 'ownerAcknowledgedAt') as string, assets: typedAssets.map(asset => ({ ...asset, scopes: [...asset.scopes] })) } };
}

export function validateAuthorizationGrant(value: unknown, now: string): AuthorizationValidation { try { return grantCore(value, now, true); } catch { return { ok: false, reason: 'invalid_schema' }; } }

function validEvent(value: unknown, expectedGrantId: string): value is AuthorizationEventInput {
  if (!safeGraph(value)) return false;
  const record = descriptors(value);
  if (!record || !hasOnly(record, ['eventId', 'grantId', 'type', 'occurredAt', 'actorRef', 'assetType', 'exitStep']) || !safeId(field(record, 'eventId')) || field(record, 'grantId') !== expectedGrantId || !safeId(field(record, 'actorRef')) || !timestamp(field(record, 'occurredAt'))) return false;
  const type = field(record, 'type'); const needsAsset = type === 'scope_changed' || type === 'asset_contested' || type === 'asset_restored'; const needsStep = type === 'exit_step_acknowledged';
  if (!(['grant_recorded', 'scope_changed', 'asset_contested', 'asset_restored', 'grant_revoked', 'exit_step_acknowledged'] as string[]).includes(String(type))) return false;
  return (needsAsset ? assetType(field(record, 'assetType')) : field(record, 'assetType') === undefined) && (needsStep ? exitStep(field(record, 'exitStep')) : field(record, 'exitStep') === undefined);
}

function validLedger(value: unknown, grantId: string): value is AuthorizationLedger {
  if (!safeGraph(value)) return false;
  const record = descriptors(value);
  if (!record || !hasOnly(record, ['schemaVersion', 'grantId', 'events']) || field(record, 'schemaVersion') !== 1 || field(record, 'grantId') !== grantId || !Array.isArray(field(record, 'events'))) return false;
  let previous = ZERO_DIGEST; let priorTime = -Infinity; const ids = new Set<string>();
  for (const item of field(record, 'events') as unknown[]) {
    const stored = descriptors(item);
    if (!stored || !hasOnly(stored, ['eventId', 'grantId', 'type', 'occurredAt', 'actorRef', 'assetType', 'exitStep', 'previousEventDigest', 'eventDigest'])) return false;
    const input = { eventId: field(stored, 'eventId'), grantId: field(stored, 'grantId'), type: field(stored, 'type'), occurredAt: field(stored, 'occurredAt'), actorRef: field(stored, 'actorRef'), ...(field(stored, 'assetType') === undefined ? {} : { assetType: field(stored, 'assetType') }), ...(field(stored, 'exitStep') === undefined ? {} : { exitStep: field(stored, 'exitStep') }) };
    if (!validEvent(input, grantId) || typeof field(stored, 'previousEventDigest') !== 'string' || typeof field(stored, 'eventDigest') !== 'string' || field(stored, 'previousEventDigest') !== previous || !DIGEST.test(field(stored, 'eventDigest') as string) || Date.parse(field(stored, 'occurredAt') as string) <= priorTime || ids.has(field(stored, 'eventId') as string)) return false;
    const unsigned = { ...input, previousEventDigest: field(stored, 'previousEventDigest') as string } as Omit<StoredAuthorizationEvent, 'eventDigest'>;
    if (field(stored, 'eventDigest') !== digest(unsigned)) return false;
    previous = field(stored, 'eventDigest') as string; priorTime = Date.parse(field(stored, 'occurredAt') as string); ids.add(field(stored, 'eventId') as string);
  }
  return true;
}

export function recordAuthorizationEvent(grantId: string, input: unknown, customRoot: string): LedgerResult {
  if (!safeId(grantId) || !nonblankText(customRoot, 4096) || !validEvent(input, grantId)) return { ok: false, reason: 'invalid_input' };
  const root = path.resolve(customRoot); const target = path.resolve(root, `${grantId}.json`); const temporary = path.join(root, `.${grantId}.${crypto.randomUUID()}.tmp`);
  if (target !== path.join(root, `${grantId}.json`)) return { ok: false, reason: 'unsafe_path' };
  try {
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    if (fs.lstatSync(root).isSymbolicLink() || (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink())) return { ok: false, reason: 'symlink_rejected' };
    let ledger: AuthorizationLedger = { schemaVersion: 1, grantId, events: [] };
    if (fs.existsSync(target)) {
      if (fs.statSync(target).size > MAX_BYTES) return { ok: false, reason: 'invalid_ledger' };
      const existing: unknown = JSON.parse(fs.readFileSync(target, 'utf8'));
      if (!validLedger(existing, grantId)) return { ok: false, reason: 'invalid_ledger' };
      ledger = existing;
    }
    if (ledger.events.some(event => event.eventId === input.eventId) || (ledger.events.length > 0 && Date.parse(input.occurredAt) <= Date.parse(ledger.events[ledger.events.length - 1].occurredAt))) return { ok: false, reason: 'event_order' };
    const unsigned = { ...input, previousEventDigest: ledger.events.length ? ledger.events[ledger.events.length - 1].eventDigest : ZERO_DIGEST };
    const updated: AuthorizationLedger = { schemaVersion: 1, grantId, events: [...ledger.events, { ...unsigned, eventDigest: digest(unsigned) }] };
    const body = `${canonical(updated)}\n`;
    if (Buffer.byteLength(body, 'utf8') > MAX_BYTES) return { ok: false, reason: 'ledger_too_large' };
    fs.writeFileSync(temporary, body, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, target);
    return { ok: true, ledger: updated };
  } catch {
    try { fs.rmSync(temporary, { force: true }); } catch { /* cleanup only */ }
    return { ok: false, reason: 'persistence_failed' };
  }
}

function affected(events: StoredAuthorizationEvent[]): AssetType[] { return [...new Set(events.flatMap(event => event.assetType ? [event.assetType] : []))].sort() as AssetType[]; }
export function deriveAssetControlState(grant: AuthorizationGrant, ledger: unknown, now: string): AssetControlState {
  const historical = grantCore(grant, grant.expiresAt, false);
  if (!historical.ok || !timestamp(now) || !validLedger(ledger, historical.ok ? historical.grant.grantId : '')) return { state: 'held', reasons: ['invalid_event_history'], affectedAssetTypes: [] };
  const events = ledger.events; const touched = affected(events); const contested = new Set<AssetType>();
  for (const event of events) { if (event.type === 'asset_contested' && event.assetType) contested.add(event.assetType); if (event.type === 'asset_restored' && event.assetType) contested.delete(event.assetType); }
  if (events.some(event => event.type === 'grant_revoked')) return { state: 'revoked', reasons: ['grant_revoked'], affectedAssetTypes: touched };
  if (Date.parse(historical.grant.expiresAt) <= Date.parse(now)) return { state: 'expired', reasons: ['grant_expired'], affectedAssetTypes: touched };
  const reasons: string[] = [];
  if (!events.some(event => event.type === 'grant_recorded')) reasons.push('grant_not_recorded');
  if (contested.size) reasons.push('asset_contested');
  if (historical.grant.assets.length !== ASSET_TYPES.length || !ASSET_TYPES.every(type => historical.grant.assets.some(asset => asset.assetType === type && asset.ownerId === historical.grant.customerOwnerId && asset.managerId === 'wao'))) reasons.push('ownership_evidence_missing');
  return reasons.length ? { state: 'held', reasons: [...new Set(reasons)].sort(), affectedAssetTypes: [...new Set([...touched, ...contested])].sort() as AssetType[] } : { state: 'customer_controlled', reasons: [], affectedAssetTypes: [] };
}

function stepAssets(step: ExitStep): AssetType[] { return ({ data_export_or_deletion_decision: ['content_media_rights'], permissions_released: ['domain_dns'], git_role_released: ['git_repository'], cloudflare_role_released: ['cloudflare_pages'], gbp_role_released: ['google_business_profile'], tracking_removal_decision: ['analytics', 'search_console'], lead_routing_stopped: ['lead_recipient'], owner_exit_acknowledged: [] } as Record<ExitStep, AssetType[]>)[step]; }
export function deriveExitChecklist(grant: AuthorizationGrant, ledger: unknown): ExitChecklistItem[] {
  const events = validLedger(ledger, grant.grantId) ? ledger.events : [];
  return EXIT_STEPS.map(step => { const acknowledgement = events.find(event => event.type === 'exit_step_acknowledged' && event.exitStep === step); return acknowledgement ? { exitStep: step, state: 'acknowledged', eventId: acknowledgement.eventId, occurredAt: acknowledgement.occurredAt, affectedAssetTypes: stepAssets(step) } : { exitStep: step, state: 'pending', affectedAssetTypes: stepAssets(step) }; });
}
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ASSET_TYPES, EXIT_STEPS, deriveAssetControlState, deriveExitChecklist, recordAuthorizationEvent, validateAuthorizationGrant } from './authorization';
import type { AuthorizationGrant, AssetType } from './authorization';

const NOW = '2026-02-01T00:00:00.000Z';
const DIGEST = 'a'.repeat(64);
const SCOPES: Record<AssetType, string[]> = { domain_dns: ['dns_edit', 'dns_read'], git_repository: ['repository_read', 'repository_write'], cloudflare_pages: ['pages_deploy', 'pages_read'], analytics: ['analytics_read'], search_console: ['search_console_read'], google_business_profile: ['gbp_manage', 'gbp_read'], content_media_rights: ['content_use'], lead_recipient: ['lead_delivery'] };

function grant(): AuthorizationGrant {
  return { schemaVersion: 1, grantId: 'grant-1', siteId: 'site-1', customerOwnerId: 'owner-1', managerId: 'wao', processingPurpose: 'bounded processing', grantedAt: '2026-01-01T00:00:00.000Z', ownerAcknowledgedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-03-01T00:00:00.000Z', assets: ASSET_TYPES.map((assetType, index) => ({ assetType, assetId: `asset-${index}`, ownerId: 'owner-1', managerId: 'wao', scopes: [...SCOPES[assetType]], evidenceDigest: DIGEST })) };
}
function event(eventId: string, occurredAt: string, type = 'grant_recorded', extra: Record<string, unknown> = {}): Record<string, unknown> { return { eventId, grantId: 'grant-1', type, occurredAt, actorRef: 'actor-1', ...extra }; }
function root(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'authorization-')); }
function reject(value: unknown): void { assert.equal(validateAuthorizationGrant(value, NOW).ok, false); }
function write(directory: string, input: Record<string, unknown>): void { assert.equal(recordAuthorizationEvent('grant-1', input, directory).ok, true); }

test('accepts exactly one complete customer-owned strict grant', () => {
  const result = validateAuthorizationGrant(grant(), NOW);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.grant.assets.map(asset => asset.assetType), ASSET_TYPES);
});

test('rejects every missing and duplicate controlled asset type and id', () => {
  for (const type of ASSET_TYPES) reject({ ...grant(), assets: grant().assets.filter(asset => asset.assetType !== type) });
  for (const type of ASSET_TYPES) {
    const value = grant(); const index = value.assets.findIndex(asset => asset.assetType === type);
    const donorIndex = (index + 1) % value.assets.length;
    const donorType = value.assets[donorIndex].assetType;
    value.assets[index] = { ...value.assets[index], assetType: donorType, scopes: [...SCOPES[donorType]] };
    reject(value);
  }
  for (const index of ASSET_TYPES.keys()) {
    const value = grant(); const donorIndex = (index + 1) % value.assets.length;
    value.assets[index] = { ...value.assets[index], assetId: value.assets[donorIndex].assetId }; reject(value);
  }
});

test('rejects owner manager purpose identifier and date boundaries', () => {
  const cases: unknown[] = [
    { ...grant(), customerOwnerId: 'wao' }, { ...grant(), managerId: 'owner-1' }, { ...grant(), processingPurpose: '   ' }, { ...grant(), processingPurpose: 'x'.repeat(257) },
    { ...grant(), grantId: '../bad' }, { ...grant(), siteId: '' }, { ...grant(), ownerAcknowledgedAt: '2025-12-31T23:59:59.999Z' }, { ...grant(), expiresAt: '2026-01-01T00:00:00.000Z' }, { ...grant(), expiresAt: NOW }, { ...grant(), grantedAt: '2026-01-01T00:00:00Z' }, { ...grant(), expiresAt: 'not-a-date' },
  ];
  for (const value of cases) reject(value);
  for (const index of ASSET_TYPES.keys()) { const value = grant(); value.assets[index] = { ...value.assets[index], ownerId: 'other-1' }; reject(value); }
  for (const index of ASSET_TYPES.keys()) { const value = grant(); value.assets[index] = { ...value.assets[index], managerId: 'other' as 'wao' }; reject(value); }
});

test('validates each scope set and rejects wrong duplicate empty unsorted and unknown scopes', () => {
  for (const type of ASSET_TYPES) { const value = grant(); const index = value.assets.findIndex(asset => asset.assetType === type); value.assets[index] = { ...value.assets[index], scopes: [SCOPES[type][0]] }; assert.equal(validateAuthorizationGrant(value, NOW).ok, true); }
  for (const index of ASSET_TYPES.keys()) {
    const value = grant(); value.assets[index] = { ...value.assets[index], scopes: [] }; reject(value);
    const duplicate = grant(); duplicate.assets[index] = { ...duplicate.assets[index], scopes: [SCOPES[duplicate.assets[index].assetType][0], SCOPES[duplicate.assets[index].assetType][0]] }; reject(duplicate);
    const wrong = grant(); wrong.assets[index] = { ...wrong.assets[index], scopes: ['unknown_scope'] }; reject(wrong);
  }
  const unsorted = grant(); unsorted.assets[0] = { ...unsorted.assets[0], scopes: ['dns_read', 'dns_edit'] }; reject(unsorted);
});

test('rejects unknown forbidden hostile and nonplain unknown values without throwing', () => {
  const cyclic: Record<string, unknown> = { ...grant() }; cyclic.self = cyclic;
  const accessor = grant() as unknown as Record<string, unknown>; Object.defineProperty(accessor, 'siteId', { enumerable: true, get() { throw new Error('must not run'); } });
  const symbol = { ...grant(), [Symbol('x')]: 'x' };
  const nestedForbidden = { ...grant(), assets: grant().assets.map((asset, index) => index === 0 ? { ...asset, nested: { apiKey: 'x' } } : asset) };
  for (const value of [null, [], new Date(), cyclic, accessor, symbol, { ...grant(), unknown: true }, nestedForbidden]) assert.doesNotThrow(() => reject(value));
});

test('persists deterministic first and chained SHA-256 events with restrictive mode', () => {
  const directory = root();
  try {
    write(directory, event('event-1', '2026-01-02T00:00:00.000Z'));
    const first = JSON.parse(fs.readFileSync(path.join(directory, 'grant-1.json'), 'utf8'));
    assert.equal(first.events[0].previousEventDigest, '0'.repeat(64));
    assert.equal(first.events[0].eventDigest, crypto.createHash('sha256').update(JSON.stringify({ actorRef: 'actor-1', eventId: 'event-1', grantId: 'grant-1', occurredAt: '2026-01-02T00:00:00.000Z', previousEventDigest: '0'.repeat(64), type: 'grant_recorded' })).digest('hex'));
    write(directory, event('event-2', '2026-01-03T00:00:00.000Z', 'scope_changed', { assetType: 'domain_dns' }));
    const secondBytes = fs.readFileSync(path.join(directory, 'grant-1.json'));
    const second = JSON.parse(secondBytes.toString('utf8'));
    assert.equal(second.events.length, 2); assert.equal(second.events[1].previousEventDigest, second.events[0].eventDigest);
    assert.equal(fs.statSync(path.join(directory, 'grant-1.json')).mode & 0o777, 0o600);
    assert.deepEqual(secondBytes, Buffer.from(`${JSON.stringify(second)}\n`));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('keeps existing ledger bytes after all rejected append classes', () => {
  const directory = root();
  try {
    write(directory, event('event-1', '2026-01-02T00:00:00.000Z'));
    const target = path.join(directory, 'grant-1.json'); const before = fs.readFileSync(target);
    const invalid = [event('event-1', '2026-01-03T00:00:00.000Z'), event('event-2', '2026-01-02T00:00:00.000Z'), { ...event('event-3', '2026-01-04T00:00:00.000Z'), grantId: 'other-1' }, { ...event('event-4', '2026-01-04T00:00:00.000Z'), actorRef: '../bad' }, event('event-5', '2026-01-04T00:00:00.000Z', 'grant_revoked', { assetType: 'domain_dns' })];
    for (const input of invalid) assert.equal(recordAuthorizationEvent('grant-1', input, directory).ok, false);
    assert.equal(recordAuthorizationEvent('../escape', event('event-6', '2026-01-05T00:00:00.000Z'), directory).ok, false);
    assert.deepEqual(fs.readFileSync(target), before); assert.equal(fs.readdirSync(directory).some(name => name.endsWith('.tmp')), false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('rejects root target traversal symlinks malformed fields and every event shape error', () => {
  const directory = root(); const outer = root();
  try {
    fs.symlinkSync(outer, path.join(directory, 'linked')); assert.equal(recordAuthorizationEvent('grant-1', event('event-1', '2026-01-02T00:00:00.000Z'), path.join(directory, 'linked')).ok, false);
    const target = path.join(directory, 'grant-1.json'); fs.symlinkSync(outer, target); assert.equal(recordAuthorizationEvent('grant-1', event('event-1', '2026-01-02T00:00:00.000Z'), directory).ok, false); fs.rmSync(target);
    fs.writeFileSync(target, '{"schemaVersion":1,"grantId":"grant-1","events":[{"unknown":true}]}'); assert.equal(recordAuthorizationEvent('grant-1', event('event-1', '2026-01-02T00:00:00.000Z'), directory).ok, false); fs.rmSync(target);
    const shapes: Record<string, unknown>[] = [event('a-1', '2026-01-02T00:00:00.000Z', 'scope_changed'), event('a-2', '2026-01-02T00:00:00.000Z', 'grant_recorded', { assetType: 'domain_dns' }), event('a-3', '2026-01-02T00:00:00.000Z', 'exit_step_acknowledged'), event('a-4', '2026-01-02T00:00:00.000Z', 'grant_revoked', { exitStep: 'owner_exit_acknowledged' }), { ...event('a-5', '2026-01-02T00:00:00.000Z'), extra: true }];
    for (const input of shapes) assert.equal(recordAuthorizationEvent('grant-1', input, directory).ok, false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(outer, { recursive: true, force: true }); }
});

test('fails closed for tamper history missing grant activation and contest ordering', () => {
  const directory = root();
  try {
    const empty = { schemaVersion: 1, grantId: 'grant-1', events: [] }; assert.equal(deriveAssetControlState(grant(), empty, NOW).state, 'held');
    write(directory, event('event-1', '2026-01-02T00:00:00.000Z'));
    write(directory, event('event-2', '2026-01-03T00:00:00.000Z', 'asset_contested', { assetType: 'domain_dns' }));
    const contested = JSON.parse(fs.readFileSync(path.join(directory, 'grant-1.json'), 'utf8')); assert.deepEqual(deriveAssetControlState(grant(), contested, NOW), { state: 'held', reasons: ['asset_contested'], affectedAssetTypes: ['domain_dns'] });
    write(directory, event('event-3', '2026-01-04T00:00:00.000Z', 'asset_restored', { assetType: 'domain_dns' }));
    const restored = JSON.parse(fs.readFileSync(path.join(directory, 'grant-1.json'), 'utf8')); assert.equal(deriveAssetControlState(grant(), restored, NOW).state, 'customer_controlled');
    restored.events[0].eventDigest = DIGEST; assert.deepEqual(deriveAssetControlState(grant(), restored, NOW), { state: 'held', reasons: ['invalid_event_history'], affectedAssetTypes: [] });
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('uses revocation expiry precedence and all exact ordered exit mappings', () => {
  const directory = root();
  try {
    write(directory, event('event-1', '2026-01-02T00:00:00.000Z'));
    write(directory, event('event-2', '2026-01-03T00:00:00.000Z', 'grant_revoked'));
    const ledger = JSON.parse(fs.readFileSync(path.join(directory, 'grant-1.json'), 'utf8'));
    assert.equal(deriveAssetControlState({ ...grant(), expiresAt: '2026-01-31T00:00:00.000Z' }, ledger, NOW).state, 'revoked');
    const single = { schemaVersion: 1, grantId: 'grant-1', events: [ledger.events[0]] }; assert.equal(deriveAssetControlState({ ...grant(), expiresAt: '2026-01-31T00:00:00.000Z' }, single, NOW).state, 'expired');
    const checklist = deriveExitChecklist(grant(), ledger); assert.deepEqual(checklist.map(item => item.exitStep), EXIT_STEPS); assert.deepEqual(checklist.map(item => item.affectedAssetTypes), [['content_media_rights'], ['domain_dns'], ['git_repository'], ['cloudflare_pages'], ['google_business_profile'], ['analytics', 'search_console'], ['lead_recipient'], []]);
    assert.equal(checklist.every(item => item.state === 'pending'), true);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('acknowledges every exit step deterministically without external effects', () => {
  const directory = root();
  try {
    write(directory, event('event-1', '2026-01-02T00:00:00.000Z'));
    for (const [index, step] of EXIT_STEPS.entries()) write(directory, event(`event-${index + 2}`, `2026-01-${String(index + 3).padStart(2, '0')}T00:00:00.000Z`, 'exit_step_acknowledged', { exitStep: step }));
    const ledger = JSON.parse(fs.readFileSync(path.join(directory, 'grant-1.json'), 'utf8')); const checklist = deriveExitChecklist(grant(), ledger);
    assert.equal(checklist.every(item => item.state === 'acknowledged' && item.eventId && item.occurredAt), true);
    assert.deepEqual(deriveExitChecklist(grant(), ledger), checklist);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
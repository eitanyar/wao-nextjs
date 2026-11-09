import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handlePrefillRequest, PREFILL_AUDIT_LIMIT, PREFILL_IP_LIMIT, resolvePrefillProviderMode, type PrefillDependencies } from './prefillHandler';
import type { AuditRecord } from './auditStore';
import type { PrefillSnapshot } from './placePrefill';

const AUDIT = '123e4567-e89b-42d3-a456-426614174000';
const OTHER_AUDIT = '123e4567-e89b-42d3-a456-426614174001';
const candidate = (placeId: string) => ({
  placeId, displayName: `Synthetic ${placeId}`, formattedAddress: 'Synthetic Address', types: [], hasRegularOpeningHours: true,
  hasSpecialOpeningHours: false, hasPhone: true, hasWebsite: true, photosFetched: true, photoCount: 3, hasRating: true, hasEditorialSummary: false,
});
const record: AuditRecord = {
  auditId: AUDIT, query: { businessName: 'Synthetic' }, fetchedAt: '2026-11-09T00:00:00Z', expiresAt: '2026-12-09T00:00:00Z',
  candidates: [candidate('ChIJ-place-one'), candidate('ChIJ-place-two'), candidate('fixture-fail-place')],
};

function harness(overrides: Partial<PrefillDependencies> = {}) {
  const calls = { rate: [] as string[], audit: 0, fetch: [] as string[], logs: [] as string[] };
  const buckets = new Map<string, number>();
  const deps: PrefillDependencies = {
    mode: 'live',
    rateLimit: (key, limit) => {
      calls.rate.push(key);
      const count = (buckets.get(key) ?? 0) + 1;
      buckets.set(key, count);
      return { allowed: count <= limit.maxRequests };
    },
    readAudit: async id => { calls.audit++; return id === AUDIT ? record : null; },
    hasLiveKey: () => true,
    fetchSnapshot: async placeId => { calls.fetch.push(placeId); return { placeId, displayName: 'Live', formattedAddress: 'Live', types: [] } as PrefillSnapshot; },
    logFailure: code => calls.logs.push(code),
    ...overrides,
  };
  const get = (auditId: string | null, placeId: string | null, ip = '203.0.113.1') => handlePrefillRequest({ auditId, placeId, ip }, deps);
  return { get, calls };
}

describe('prefill handler: candidate check', () => {
  it('a placeId from the audit record gets one fresh Places read', async () => {
    const { get, calls } = harness();
    const reply = await get(AUDIT, 'ChIJ-place-two');
    assert.equal(reply.status, 200);
    assert.equal(reply.body.status, 'ready');
    assert.equal((reply.body.snapshot as PrefillSnapshot).placeId, 'ChIJ-place-two');
    assert.deepEqual(calls.fetch, ['ChIJ-place-two']);
  });

  it('a foreign placeId, or an unknown audit, is 404 with no Places call (not a proxy, not an oracle)', async () => {
    const { get, calls } = harness();
    const foreign = await get(AUDIT, 'ChIJ-not-in-this-audit');
    const unknownAudit = await get(OTHER_AUDIT, 'ChIJ-place-one');
    assert.deepEqual(foreign, { status: 404, body: { error: 'not_found' } });
    assert.deepEqual(unknownAudit, foreign);
    assert.deepEqual(calls.fetch, []);
  });

  it('malformed input is 400 before rate limit, store or network', async () => {
    const { get, calls } = harness();
    for (const [auditId, placeId] of [[null, 'ChIJ-place-one'], [AUDIT, null], ['../x', 'ChIJ-place-one'], [AUDIT, '../../etc'], [AUDIT, 'a b c d e f g h']]) {
      assert.deepEqual(await get(auditId, placeId), { status: 400, body: { error: 'invalid_input' } });
    }
    assert.deepEqual(calls, { rate: [], audit: 0, fetch: [], logs: [] });
  });
});

describe('prefill handler: rate limits', () => {
  it('per IP, before the audit store is read', async () => {
    const { get, calls } = harness();
    for (let i = 0; i < PREFILL_IP_LIMIT.maxRequests; i++) {
      const auditId = `123e4567-e89b-42d3-a456-4266141740${String(i).padStart(2, '0')}`;
      await get(auditId, 'ChIJ-place-one');
    }
    const auditReads = calls.audit;
    assert.deepEqual(await get(AUDIT, 'ChIJ-place-one'), { status: 429, body: { error: 'rate_limited' } });
    assert.equal(calls.audit, auditReads);
  });

  it('per audit, across IPs', async () => {
    const { get, calls } = harness();
    for (let i = 0; i < PREFILL_AUDIT_LIMIT.maxRequests; i++) assert.equal((await get(AUDIT, 'ChIJ-place-one', `198.51.100.${i}`)).status, 200);
    assert.deepEqual(await get(AUDIT, 'ChIJ-place-one', '198.51.100.99'), { status: 429, body: { error: 'rate_limited' } });
    assert.equal(calls.fetch.length, PREFILL_AUDIT_LIMIT.maxRequests);
  });
});

describe('prefill handler: providers', () => {
  it('fixture mode never touches the live key or network', async () => {
    const { get, calls } = harness({
      mode: 'fixture',
      hasLiveKey: () => { throw new Error('live key read'); },
      fetchSnapshot: async () => { throw new Error('network'); },
    });
    const reply = await get(AUDIT, 'ChIJ-place-one');
    assert.equal(reply.status, 200);
    const snapshot = reply.body.snapshot as PrefillSnapshot;
    assert.equal(snapshot.placeId, 'ChIJ-place-one');
    assert.equal(snapshot.displayName, 'Synthetic ChIJ-place-one');
    assert.deepEqual(calls.fetch, []);
    assert.deepEqual(await get(AUDIT, 'fixture-fail-place'), { status: 502, body: { error: 'prefill_failed' } });
    assert.deepEqual(calls.logs, ['PREFILL_FIXTURE_FAILED']);
  });

  it('live mode: no key is 503, a Places failure or mismatched id is 502 with a bounded log code', async () => {
    assert.deepEqual(await harness({ hasLiveKey: () => false }).get(AUDIT, 'ChIJ-place-one'), { status: 503, body: { error: 'prefill_unavailable' } });
    const failing = harness({ fetchSnapshot: async () => { throw new Error('Places details failed: 500 secret body'); } });
    assert.deepEqual(await failing.get(AUDIT, 'ChIJ-place-one'), { status: 502, body: { error: 'prefill_failed' } });
    assert.deepEqual(failing.calls.logs, ['PREFILL_PLACES_FAILED']);
    const mismatched = harness({ fetchSnapshot: async () => ({ placeId: 'ChIJ-other', displayName: '', formattedAddress: '', types: [] }) });
    assert.equal((await mismatched.get(AUDIT, 'ChIJ-place-one')).status, 502);
  });

  it('SITE_BOT_PREFILL_PROVIDER: fixture only off production; unknown values throw off production', () => {
    assert.equal(resolvePrefillProviderMode({}), 'live');
    assert.equal(resolvePrefillProviderMode({ SITE_BOT_PREFILL_PROVIDER: 'live', NODE_ENV: 'development' }), 'live');
    assert.equal(resolvePrefillProviderMode({ SITE_BOT_PREFILL_PROVIDER: 'fixture', NODE_ENV: 'development' }), 'fixture');
    assert.equal(resolvePrefillProviderMode({ SITE_BOT_PREFILL_PROVIDER: 'fixture', NODE_ENV: 'production' }), 'live');
    assert.throws(() => resolvePrefillProviderMode({ SITE_BOT_PREFILL_PROVIDER: 'fake', NODE_ENV: 'development' }));
  });
});

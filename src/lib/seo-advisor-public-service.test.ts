import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { closePublicSeoBudgetStore, openPublicSeoBudgetStore, reservePublicSeoOverview } from './seo-advisor-public-budget';
import type { PublicSeoExecutor } from './seo-advisor-public-orchestrator';
import { loadPublicSeoDialogue, startPublicSeoSession } from './seo-advisor-public-session';
import {
  PUBLIC_SEO_RATE_LIMIT, handlePublicSeoEvent, signPublicSeoSession, verifyPublicSeoSession,
  type PublicSeoSessionWithMarket,
} from './seo-advisor-public-service';

const clock = () => Date.parse('2026-10-02T12:00:00.000Z');
const secret = 'offline-test-secret';
const fresh = startPublicSeoSession().session;
const ready: PublicSeoSessionWithMarket = {
  state: 'S2', domain: 'example.test', consented: true, runCount: 0, introBeat: 0, realFinding: false, market: 'IL',
};
const finding = { retrievedAt: '2026-10-02T11:00:00.000Z', organicTraffic: 42, organicKeywords: null };

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'public-seo-service-'));
  const store = openPublicSeoBudgetStore({ dbPath: path.join(dir, 'gate.sqlite'), now: () => new Date(clock()) });
  const calls: Parameters<PublicSeoExecutor>[0][] = [];
  let expected = false;
  const executor: PublicSeoExecutor = async request => {
    calls.push(request);
    if (!expected) throw new Error('Unexpected executor call');
    return finding;
  };
  const base = { store, executor, dailyCeiling: 300, projectId: 'project-1', clientKey: 'client-1', secret,
    now: clock, checkLimit: () => ({ allowed: true, remaining: 11, retryAfterMs: 0 }) };
  return {
    store, calls, base, allowExecutor() { expected = true; },
    close() { closePublicSeoBudgetStore(store); fs.rmSync(dir, { recursive: true, force: true }); },
  };
}
function signed(session: PublicSeoSessionWithMarket = ready, issued = clock()) {
  return signPublicSeoSession(session, { secret, now: () => issued });
}
function resignPayload(session: unknown): string {
  const parts = signed().split('.');
  parts[3] = Buffer.from(JSON.stringify(session)).toString('base64url');
  const body = parts.slice(0, 4).join('.');
  parts[4] = createHmac('sha256', secret).update(body).digest('hex');
  return parts.join('.');
}
function ok(result: Awaited<ReturnType<typeof handlePublicSeoEvent>>) {
  assert.equal(result.status, 'ok');
  return result as Extract<typeof result, { status: 'ok' }>;
}

test('signed session round-trips with and without the optional market', () => {
  assert.deepEqual(verifyPublicSeoSession(signed(ready), { secret, now: clock }), ready);
  assert.deepEqual(verifyPublicSeoSession(signed(fresh), { secret, now: clock }), fresh);
  assert.equal(signed().split('.').length, 5);
  assert.throws(() => signPublicSeoSession(fresh, { secret: '' }));
  assert.throws(() => signPublicSeoSession(fresh, { secret, now: () => NaN }));
});

test('expiry, future issue, malformed encoding, and damaged signature are rejected', () => {
  assert.equal(verifyPublicSeoSession(signed(ready, clock() - 30 * 60_000), { secret, now: clock }), null);
  assert.equal(verifyPublicSeoSession(signed(ready, clock() + 60_001), { secret, now: clock }), null);
  const parts = signed().split('.');
  assert.equal(verifyPublicSeoSession(`v2.${parts.slice(1).join('.')}`, { secret, now: clock }), null);
  assert.equal(verifyPublicSeoSession(parts.slice(0, 4).join('.'), { secret, now: clock }), null);
  assert.equal(verifyPublicSeoSession([parts[0], parts[1], parts[2], '@', parts[4]].join('.'), { secret, now: clock }), null);
  assert.equal(verifyPublicSeoSession([parts[0], parts[1], parts[2], parts[3], '0'.repeat(64)].join('.'), { secret, now: clock }), null);
  for (const index of [0, 63]) {
    const damaged = [...parts];
    const original = damaged[4][index];
    damaged[4] = damaged[4].slice(0, index) + (original === '0' ? '1' : '0') + damaged[4].slice(index + 1);
    assert.equal(verifyPublicSeoSession(damaged.join('.'), { secret, now: clock }), null);
  }
  assert.equal(verifyPublicSeoSession(signed(), { secret: 'wrong-secret', now: clock }), null);
  assert.equal(verifyPublicSeoSession(25, { secret, now: clock }), null);
  assert.equal(verifyPublicSeoSession(signed(), { secret: '' }), null);
});

test('tampered consent payload fails HMAC even when it is syntactically valid', () => {
  const parts = signed({ ...ready, consented: false }).split('.');
  parts[3] = Buffer.from(JSON.stringify(ready)).toString('base64url');
  assert.equal(verifyPublicSeoSession(parts.join('.'), { secret, now: clock }), null);
});

test('validly signed payloads with extra, missing, or invalid shape fields fail closed', () => {
  for (const session of [
    { ...ready, extra: 'anything' },
    { state: 'S2', domain: 'example.test', consented: true, runCount: 0, introBeat: 0, market: 'IL' },
    { ...ready, market: 'DE' }, { ...ready, runCount: 2 }, { ...ready, introBeat: -1 },
    { ...ready, state: 'S6' }, { ...ready, domain: 42 }, { ...ready, realFinding: 'true' },
  ]) assert.equal(verifyPublicSeoSession(resignPayload(session), { secret, now: clock }), null);
});

test('invalid config short-circuits before rate limit or token work', async () => {
  const x = fixture();
  try {
    let limitCalls = 0;
    const result = await handlePublicSeoEvent({ ...x.base, dailyCeiling: 299, token: signed(), event: { type: 'run' },
      checkLimit: () => { limitCalls += 1; throw new Error('should not reach limiter'); } });
    assert.deepEqual(result, { status: 'unavailable' });
    assert.equal(limitCalls, 0);
    assert.equal(x.calls.length, 0);
  } finally { x.close(); }
});

test('all required config fields fail closed before invoking the limiter', async () => {
  const x = fixture();
  try {
    let limitCalls = 0;
    const checkLimit = () => { limitCalls += 1; throw new Error('unexpected limiter call'); };
    for (const changes of [
      { secret: '' }, { clientKey: ' ' }, { dailyCeiling: 300.5 }, { dailyCeiling: NaN },
      { projectId: '' }, { executor: null as unknown as PublicSeoExecutor },
    ]) {
      assert.deepEqual(await handlePublicSeoEvent({ ...x.base, ...changes, token: signed(),
        event: { type: 'run' }, checkLimit }), { status: 'unavailable' });
    }
    assert.equal(limitCalls, 0);
    assert.equal(x.calls.length, 0);
  } finally { x.close(); }
});

test('denied limiter precedes malformed token, event, store, and executor', async () => {
  const x = fixture();
  try {
    const calls: string[] = [];
    const result = await handlePublicSeoEvent({ ...x.base, token: 'not-a-token', event: { type: 'run' },
      checkLimit: (key, limit) => {
        calls.push(key);
        assert.deepEqual(limit, PUBLIC_SEO_RATE_LIMIT);
        return { allowed: false, remaining: 0, retryAfterMs: 1234 };
      } });
    assert.deepEqual(result, { status: 'rate_limited', retryAfterMs: 1234 });
    assert.deepEqual(calls, ['public-seo:client-1']);
    assert.equal(x.calls.length, 0);
    assert.equal((x.store.db.prepare('SELECT count(*) AS n FROM public_seo_overviews').get() as { n: number }).n, 0);
  } finally { x.close(); }
});

test('valid rate-limit pass still rejects invalid tokens before events and advance', async () => {
  const x = fixture();
  try {
    assert.deepEqual(await handlePublicSeoEvent({ ...x.base, token: 'bad', event: { type: 'run' } }), { status: 'invalid_token' });
    assert.equal(x.calls.length, 0);
  } finally { x.close(); }
});

test('limiter failures are unavailable and never reach the executor or ledger', async () => {
  const x = fixture();
  try {
    assert.deepEqual(await handlePublicSeoEvent({ ...x.base, token: signed(), event: { type: 'run' },
      checkLimit: () => { throw new Error('limiter failure'); } }), { status: 'unavailable' });
    assert.equal(x.calls.length, 0);
    assert.equal((x.store.db.prepare('SELECT count(*) AS n FROM public_seo_overviews').get() as { n: number }).n, 0);
  } finally { x.close(); }
});

test('service imports only offline dependencies and never binds a network provider', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/seo-advisor-public-service.ts'), 'utf8');
  const imports = [...source.matchAll(/from '([^']+)'/g)].map(match => match[1]);
  assert.deepEqual([...new Set(imports)].sort(), [
    './payments/rate-limit', './seo-advisor-public-budget', './seo-advisor-public-orchestrator',
    './seo-advisor-public-session', 'node:crypto',
  ]);
  assert.doesNotMatch(source, /\b(?:fetch|runOpenSeoResearch|runAdvisorPanel|createOpenSeoMcpClient)\s*\(/u);
  assert.doesNotMatch(source, /@modelcontextprotocol\/sdk|openSeoMcp|(?:node:)?https?:/u);
});

test('real submit and approve carry normalized domain and market into a signed session', async () => {
  const x = fixture();
  try {
    const submitted = ok(await handlePublicSeoEvent({ ...x.base, token: signed(fresh),
      event: { type: 'submit_domain', domain: ' Example.TEST ', market: 'IL' } }));
    assert.deepEqual(submitted.utterances, loadPublicSeoDialogue().beats.s2_consent.map(line => line.replace('{domain}', 'example.test')));
    assert.deepEqual(verifyPublicSeoSession(submitted.token, { secret, now: clock }), submitted.session);
    assert.equal(submitted.session.market, 'IL');
    const approved = ok(await handlePublicSeoEvent({ ...x.base, token: submitted.token, event: { type: 'approve' } }));
    assert.equal(approved.session.consented, true);
    assert.equal(approved.session.market, 'IL');
    assert.deepEqual(approved.utterances, loadPublicSeoDialogue().beats.s2_waiting);
    assert.equal(x.calls.length, 0);
  } finally { x.close(); }
});

test('cold IL benign run executes once, renders the fixture, signs the new state, then cannot run twice', async () => {
  const x = fixture();
  try {
    x.allowExecutor();
    const submitted = ok(await handlePublicSeoEvent({ ...x.base, token: signed(fresh),
      event: { type: 'submit_domain', domain: ' Example.TEST ', market: 'IL' } }));
    const approved = ok(await handlePublicSeoEvent({ ...x.base, token: submitted.token, event: { type: 'approve' } }));
    const result = ok(await handlePublicSeoEvent({ ...x.base, token: approved.token, event: { type: 'next_intro' } }));
    assert.deepEqual(x.calls, [{ projectId: 'project-1', domain: 'example.test', locationCode: 2376, languageCode: 'he' }]);
    assert.deepEqual(result.utterances, loadPublicSeoDialogue().beats.s3c_baseline.map(line => line.replace('{domain}', 'example.test')));
    assert.deepEqual(verifyPublicSeoSession(result.token, { secret, now: clock }), result.session);
    assert.deepEqual({ state: result.session.state, runCount: result.session.runCount,
      realFinding: result.session.realFinding, market: result.session.market },
    { state: 'S3', runCount: 1, realFinding: true, market: 'IL' });
    const repeat = ok(await handlePublicSeoEvent({ ...x.base, token: result.token, event: { type: 'next_intro' } }));
    assert.deepEqual(repeat.utterances, []);
    assert.equal(x.calls.length, 1);
    const originalReplay = ok(await handlePublicSeoEvent({ ...x.base, token: approved.token, event: { type: 'next_intro' } }));
    assert.equal(originalReplay.session.runCount, 1);
    assert.equal(x.calls.length, 1);
    assert.equal((x.store.db.prepare('SELECT count(*) AS n FROM public_seo_overviews').get() as { n: number }).n, 1);
    const close = ok(await handlePublicSeoEvent({ ...x.base, token: result.token, event: { type: 'close' } }));
    assert.deepEqual(close.utterances, loadPublicSeoDialogue().beats.s5a_warm_close);
    assert.equal(close.session.state, 'S5');
    assert.equal(close.session.market, 'IL');
  } finally { x.close(); }
});

test('same-day benign events after approve derive diagnosis beats without client run', async () => {
  const x = fixture();
  try {
    x.allowExecutor();
    const submitted = ok(await handlePublicSeoEvent({ ...x.base, token: signed(fresh),
      event: { type: 'submit_domain', domain: 'example.test', market: 'IL' } }));
    const approved = ok(await handlePublicSeoEvent({ ...x.base, token: submitted.token, event: { type: 'approve' } }));
    assert.deepEqual(approved.utterances, loadPublicSeoDialogue().beats.s2_waiting);
    assert.equal(x.calls.length, 0);
    const baseline = loadPublicSeoDialogue().beats.s3c_baseline.map(line => line.replace('{domain}', 'example.test'));
    const freshness = loadPublicSeoDialogue().beats.s3_close_freshness.map(line => line.replace('{evidence_date}', '2026-10-02'));
    for (const type of ['next_intro', 'hesitation', 'approve', 'guarantee_question', 'decline', 'close', 'no_contact'] as const) {
      const result = ok(await handlePublicSeoEvent({ ...x.base, token: approved.token, event: { type } }));
      assert.deepEqual(result.utterances, type === 'next_intro' ? baseline : [...baseline, ...freshness], type);
      assert.deepEqual({ state: result.session.state, runCount: result.session.runCount }, { state: 'S3', runCount: 1 }, type);
    }
    assert.equal(x.calls.length, 1);
    assert.equal((x.store.db.prepare('SELECT count(*) AS n FROM public_seo_overviews').get() as { n: number }).n, 1);
  } finally { x.close(); }
});

test('unconsented S2 benign events pass through without a diagnosis or executor call', async () => {
  const x = fixture();
  try {
    const token = signed({ ...ready, consented: false });
    for (const type of ['next_intro', 'hesitation'] as const) {
      const result = ok(await handlePublicSeoEvent({ ...x.base, token, event: { type } }));
      assert.deepEqual(result.utterances, []);
      assert.deepEqual({ state: result.session.state, consented: result.session.consented, runCount: result.session.runCount },
        { state: 'S2', consented: false, runCount: 0 });
    }
    const approved = ok(await handlePublicSeoEvent({ ...x.base, token, event: { type: 'approve' } }));
    assert.deepEqual(approved.utterances, loadPublicSeoDialogue().beats.s2_waiting);
    assert.equal(approved.session.runCount, 0);
    assert.equal(x.calls.length, 0);
    assert.equal((x.store.db.prepare('SELECT count(*) AS n FROM public_seo_overviews').get() as { n: number }).n, 0);
  } finally { x.close(); }
});

test('S1 benign intro and hesitation events never derive a run', async () => {
  const x = fixture();
  try {
    const first = ok(await handlePublicSeoEvent({ ...x.base, token: signed(fresh), event: { type: 'next_intro' } }));
    assert.equal(first.session.state, 'S1');
    assert.equal(first.session.introBeat, 1);
    assert.deepEqual(first.utterances, loadPublicSeoDialogue().beats.s1_open_beat_b);
    const second = ok(await handlePublicSeoEvent({ ...x.base, token: first.token, event: { type: 'next_intro' } }));
    assert.equal(second.session.introBeat, 2);
    assert.deepEqual(second.utterances, loadPublicSeoDialogue().beats.s1_open_beat_c);
    const hesitation = ok(await handlePublicSeoEvent({ ...x.base, token: second.token, event: { type: 'hesitation' } }));
    assert.equal(hesitation.session.runCount, 0);
    assert.deepEqual(hesitation.utterances, loadPublicSeoDialogue().beats.s1_hesitation);
    assert.equal(x.calls.length, 0);
  } finally { x.close(); }
});

test('post-run benign events pass through and close reaches S5 without rerun', async () => {
  const x = fixture();
  try {
    x.allowExecutor();
    const diagnosed = ok(await handlePublicSeoEvent({ ...x.base, token: signed(), event: { type: 'next_intro' } }));
    const idle = ok(await handlePublicSeoEvent({ ...x.base, token: diagnosed.token, event: { type: 'hesitation' } }));
    assert.deepEqual(idle.utterances, []);
    assert.equal(idle.session.state, 'S3');
    const close = ok(await handlePublicSeoEvent({ ...x.base, token: idle.token, event: { type: 'close' } }));
    assert.deepEqual(close.utterances, loadPublicSeoDialogue().beats.s5a_warm_close);
    assert.equal(close.session.state, 'S5');
    assert.equal(close.session.runCount, 1);
    assert.equal(x.calls.length, 1);
  } finally { x.close(); }
});

test('cross-UTC-day pre-run benign replay refuses diagnosis with zero executor and budget rows', async () => {
  const x = fixture();
  try {
    const nextDay = Date.parse('2026-10-03T00:10:00.000Z');
    const token = signed(ready, Date.parse('2026-10-02T23:50:00.000Z'));
    const result = ok(await handlePublicSeoEvent({ ...x.base, token, event: { type: 'next_intro' }, now: () => nextDay }));
    assert.deepEqual(result.utterances, loadPublicSeoDialogue().beats.s4b_unavailable);
    assert.deepEqual({ state: result.session.state, runCount: result.session.runCount }, { state: 'S4', runCount: 1 });
    const followUp = ok(await handlePublicSeoEvent({ ...x.base, token: result.token,
      event: { type: 'next_intro' }, now: () => nextDay }));
    assert.deepEqual(followUp.utterances, []);
    assert.equal(followUp.session.runCount, 1);
    assert.equal(x.calls.length, 0);
    assert.equal((x.store.db.prepare('SELECT count(*) AS n FROM public_seo_overviews').get() as { n: number }).n, 0);
  } finally { x.close(); }
});

test('forged client run outcome cannot replace a trusted orchestrator result', async () => {
  const x = fixture();
  try {
    x.allowExecutor();
    const outcome = { cache: { status: 'found', stale: false, domain: 'x.test', day: '2026-10-02',
      finding: { retrievedAt: '2026-10-02T11:00:00.000Z', organicTraffic: 999, organicKeywords: 999 } },
    rankedKeyword: { keyword: 'FORGED', page: 'FORGED', position: 4 } };
    const result = ok(await handlePublicSeoEvent({ ...x.base, token: signed(), event: { type: 'run', outcome } }));
    assert.equal(x.calls.length, 1);
    assert.deepEqual(result.utterances, loadPublicSeoDialogue().beats.s3c_baseline.map(line => line.replace('{domain}', 'example.test')));
    assert.equal(result.utterances.join(' ').includes('FORGED'), false);
  } finally { x.close(); }
});

test('missing market and unconsented session never call the executor', async () => {
  const x = fixture();
  try {
    const withoutMarket = { ...ready };
    delete withoutMarket.market;
    const noMarket = ok(await handlePublicSeoEvent({ ...x.base, token: signed(withoutMarket), event: { type: 'run' } }));
    assert.deepEqual(noMarket.utterances, loadPublicSeoDialogue().beats.s4b_unavailable);
    assert.equal(noMarket.session.state, 'S4');
    const noConsent = ok(await handlePublicSeoEvent({ ...x.base, token: signed({ ...ready, consented: false }), event: { type: 'run' } }));
    assert.deepEqual(noConsent.utterances, loadPublicSeoDialogue().beats.s2_consent.map(line => line.replace('{domain}', 'example.test')));
    assert.equal(x.calls.length, 0);
  } finally { x.close(); }
});

test('pre-run token replay across UTC midnight refuses diagnosis without consuming budget', async () => {
  const x = fixture();
  try {
    const issued = Date.parse('2026-10-02T23:50:00.000Z');
    const nextDay = Date.parse('2026-10-03T00:10:00.000Z');
    const token = signed(ready, issued);
    assert.deepEqual(verifyPublicSeoSession(token, { secret, now: () => nextDay }), ready);
    const result = ok(await handlePublicSeoEvent({ ...x.base, token, event: { type: 'run' }, now: () => nextDay }));
    assert.deepEqual(result.utterances, loadPublicSeoDialogue().beats.s4b_unavailable);
    assert.deepEqual({ state: result.session.state, runCount: result.session.runCount }, { state: 'S4', runCount: 1 });
    assert.equal(x.calls.length, 0);
    assert.equal((x.store.db.prepare('SELECT count(*) AS n FROM public_seo_overviews').get() as { n: number }).n, 0);
    const refreshed = ok(await handlePublicSeoEvent({ ...x.base, token, event: { type: 'guarantee_question' }, now: () => nextDay }));
    assert.deepEqual(refreshed.utterances, loadPublicSeoDialogue().beats.s4b_unavailable);
    assert.equal(refreshed.session.runCount, 1);
    const replay = ok(await handlePublicSeoEvent({ ...x.base, token: refreshed.token, event: { type: 'run' }, now: () => nextDay }));
    assert.deepEqual(replay.utterances, []);
    assert.equal(x.calls.length, 0);
    assert.equal((x.store.db.prepare('SELECT count(*) AS n FROM public_seo_overviews').get() as { n: number }).n, 0);
  } finally { x.close(); }
});

test('pre-spent daily budget prevents all executor calls and yields unavailable beat', async () => {
  const x = fixture();
  try {
    assert.equal(reservePublicSeoOverview(x.store, 'other.test', 300).status, 'reserved');
    const result = ok(await handlePublicSeoEvent({ ...x.base, token: signed(), event: { type: 'run' } }));
    assert.deepEqual(result.utterances, loadPublicSeoDialogue().beats.s4b_unavailable);
    assert.equal(result.session.state, 'S4');
    assert.equal(x.calls.length, 0);
  } finally { x.close(); }
});

test('executor rejection does not leak errors or retry a charged diagnosis', async () => {
  const x = fixture();
  try {
    let calls = 0;
    const executor: PublicSeoExecutor = async () => { calls += 1; throw new Error('private provider error'); };
    const token = signed();
    const result = ok(await handlePublicSeoEvent({ ...x.base, executor, token, event: { type: 'run' } }));
    assert.deepEqual(result.utterances, loadPublicSeoDialogue().beats.s4b_unavailable);
    assert.equal(result.utterances.join(' ').includes('private provider error'), false);
    assert.equal(result.session.runCount, 1);
    const replay = ok(await handlePublicSeoEvent({ ...x.base, executor, token, event: { type: 'run' } }));
    assert.deepEqual(replay.utterances, loadPublicSeoDialogue().beats.s4b_unavailable);
    assert.equal(calls, 1);
    assert.equal((x.store.db.prepare('SELECT count(*) AS n FROM public_seo_overviews').get() as { n: number }).n, 1);
  } finally { x.close(); }
});

test('invalid events fail as invalid_token and do not advance or run', async () => {
  const x = fixture();
  try {
    for (const event of [{ type: 'nonsense' }, { type: 'submit_domain', domain: 'example.test' }, null]) {
      assert.deepEqual(await handlePublicSeoEvent({ ...x.base, token: signed(), event }), { status: 'invalid_token' });
    }
    assert.equal(x.calls.length, 0);
  } finally { x.close(); }
});

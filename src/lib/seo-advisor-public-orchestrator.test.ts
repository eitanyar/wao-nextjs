import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  closePublicSeoBudgetStore, openPublicSeoBudgetStore, readPublicSeoOverview,
  reservePublicSeoOverview, savePublicSeoOverview,
  type PublicSeoOverviewFinding, type PublicSeoReservation,
} from './seo-advisor-public-budget';
import { runPublicSeoDiagnosis, type PublicSeoExecutor } from './seo-advisor-public-orchestrator';
import { mapDiagnosisOutcome } from './seo-advisor-public-session';

const finding: PublicSeoOverviewFinding = {
  retrievedAt: '2026-10-02T11:00:00.000Z', organicTraffic: 42, organicKeywords: null,
};
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'public-seo-orchestrator-'));
  let clock = '2026-10-02T12:00:00.000Z';
  const store = openPublicSeoBudgetStore({ dbPath: path.join(dir, 'gate.sqlite'), now: () => new Date(clock) });
  return {
    store,
    setClock(value: string) { clock = value; },
    rows() { return (store.db.prepare('SELECT count(*) AS count FROM public_seo_overviews').get() as { count: number }).count; },
    state(domain: string) { return (store.db.prepare('SELECT state FROM public_seo_overviews WHERE domain = ?').get(domain) as { state: string } | undefined)?.state; },
    close() { closePublicSeoBudgetStore(store); fs.rmSync(dir, { recursive: true, force: true }); },
  };
}
function spy(result?: () => Promise<PublicSeoOverviewFinding>) {
  const calls: Parameters<PublicSeoExecutor>[0][] = [];
  const executor: PublicSeoExecutor = async request => {
    calls.push(request);
    if (!result) throw new Error('Unexpected executor call');
    return result();
  };
  return { executor, calls };
}
function options(store: ReturnType<typeof fixture>['store'], executor: PublicSeoExecutor, overrides: Partial<{
  domain: string; market: string; projectId: string; dailyCeiling: number;
}> = {}) {
  return { store, executor, domain: 'example.test', market: 'IL', projectId: 'project-1', dailyCeiling: 300, ...overrides };
}
function seed(store: ReturnType<typeof fixture>['store'], domain = 'example.test') {
  const reservation = reservePublicSeoOverview(store, domain, 600);
  assert.equal(reservation.status, 'reserved');
  return (reservation as Extract<PublicSeoReservation, { status: 'reserved' }>).token;
}

test('fresh cache is read before budget and never reserves or executes', async () => {
  const x = fixture();
  try {
    assert.equal(savePublicSeoOverview(x.store, 'example.test', seed(x.store), finding), true);
    const worker = spy();
    const outcome = await runPublicSeoDiagnosis(options(x.store, worker.executor, { dailyCeiling: 1 }));
    assert.deepEqual(outcome.cache, { status: 'found', domain: 'example.test', day: '2026-10-02', stale: false, finding });
    assert.equal(outcome.reservation?.status, 'cached');
    assert.equal(x.rows(), 1);
    assert.equal(worker.calls.length, 0);
    assert.equal(mapDiagnosisOutcome(outcome).beat, 's3c_baseline');
  } finally { x.close(); }
});

test('stale cache is returned without a new reservation and maps to dated stale beat', async () => {
  const x = fixture();
  try {
    assert.equal(savePublicSeoOverview(x.store, 'example.test', seed(x.store), finding), true);
    x.setClock('2026-10-03T12:00:00.000Z');
    const worker = spy();
    const outcome = await runPublicSeoDiagnosis(options(x.store, worker.executor));
    assert.deepEqual(outcome.cache, { status: 'found', domain: 'example.test', day: '2026-10-02', stale: true, finding });
    assert.equal(x.rows(), 1);
    assert.equal(worker.calls.length, 0);
    assert.deepEqual(mapDiagnosisOutcome(outcome), { beat: 's4c_stale', freshness: true, finding });
  } finally { x.close(); }
});

for (const [market, locationCode, languageCode] of [['IL', 2376, 'he'], ['US', 2840, 'en']] as const) {
  test(`cold ${market} success executes once and finalizes the reservation`, async () => {
    const x = fixture();
    try {
      const worker = spy(async () => finding);
      const outcome = await runPublicSeoDiagnosis(options(x.store, worker.executor, { market }));
      assert.deepEqual(worker.calls, [{ projectId: 'project-1', domain: 'example.test', locationCode, languageCode }]);
      assert.equal(outcome.reservation?.status, 'reserved');
      assert.equal(outcome.reservation?.status === 'reserved' && outcome.reservation.token, '');
      assert.deepEqual(outcome.finding, finding);
      assert.equal(outcome.cache, undefined);
      assert.equal(x.state('example.test'), 'complete');
      assert.deepEqual(readPublicSeoOverview(x.store, 'example.test'), {
        status: 'found', domain: 'example.test', day: '2026-10-02', stale: false, finding,
      });
      assert.equal(mapDiagnosisOutcome(outcome).beat, 's3c_baseline');
    } finally { x.close(); }
  });
}

test('executor rejection is charged once, not saved, and maps to unavailable', async () => {
  const x = fixture();
  try {
    const worker = spy(async () => { throw new Error('private provider payload'); });
    const outcome = await runPublicSeoDiagnosis(options(x.store, worker.executor));
    assert.equal(worker.calls.length, 1);
    assert.equal(outcome.executorError, true);
    assert.equal(outcome.reservation?.status === 'reserved' && outcome.reservation.token, '');
    assert.equal(outcome.finding, undefined);
    assert.equal(x.state('example.test'), 'pending');
    assert.equal(readPublicSeoOverview(x.store, 'example.test').status, 'not_found');
    assert.equal(reservePublicSeoOverview(x.store, 'example.test', 300).status, 'already_reserved');
    assert.equal(mapDiagnosisOutcome(outcome).beat, 's4b_unavailable');
  } finally { x.close(); }
});

test('failed finalization still returns the paid finding without leaking a token', async () => {
  const x = fixture();
  try {
    const worker = spy(async () => {
      x.setClock('2026-10-03T12:00:00.000Z');
      return finding;
    });
    const outcome = await runPublicSeoDiagnosis(options(x.store, worker.executor));
    assert.equal(worker.calls.length, 1);
    assert.deepEqual(outcome.finding, finding);
    assert.equal(outcome.executorError, undefined);
    assert.equal(outcome.reservation?.status === 'reserved' && outcome.reservation.token, '');
    assert.equal(x.state('example.test'), 'pending');
    assert.equal(mapDiagnosisOutcome(outcome).beat, 's3c_baseline');
  } finally { x.close(); }
});

for (const invalid of [
  { ...finding, organicTraffic: -1 },
  { ...finding, retrievedAt: 'not-an-iso-date' },
  { ...finding, providerPayload: 'secret' },
]) {
  test('invalid executor findings are never saved or exposed', async () => {
    const x = fixture();
    try {
      const worker = spy(async () => invalid);
      const outcome = await runPublicSeoDiagnosis(options(x.store, worker.executor));
      assert.equal(worker.calls.length, 1);
      assert.equal(outcome.executorError, true);
      assert.equal(outcome.finding, undefined);
      assert.equal(x.state('example.test'), 'pending');
    } finally { x.close(); }
  });
}

test('budget below one overview blocks executor without a reservation', async () => {
  const x = fixture();
  try {
    const worker = spy();
    const outcome = await runPublicSeoDiagnosis(options(x.store, worker.executor, { dailyCeiling: 299 }));
    assert.deepEqual(outcome, { reservation: { status: 'budget_exhausted' } });
    assert.equal(mapDiagnosisOutcome(outcome).beat, 's4b_unavailable');
    assert.equal(x.rows(), 0);
    assert.equal(worker.calls.length, 0);
  } finally { x.close(); }
});

test('pending same-day reservation blocks a second executor call', async () => {
  const x = fixture();
  try {
    seed(x.store);
    const worker = spy();
    assert.deepEqual(await runPublicSeoDiagnosis(options(x.store, worker.executor)), {
      reservation: { status: 'already_reserved' },
    });
    assert.equal(x.rows(), 1);
    assert.equal(worker.calls.length, 0);
  } finally { x.close(); }
});

for (const [label, overrides] of [
  ['invalid domain', { domain: 'https://example.test' }],
  ['unsupported market', { market: 'DE' }],
  ['invalid project id', { projectId: ' ' }],
] as const) {
  test(`${label} fails closed without store writes or executor calls`, async () => {
    const x = fixture();
    try {
      const worker = spy();
      assert.deepEqual(await runPublicSeoDiagnosis(options(x.store, worker.executor, overrides)), {
        reservation: { status: 'invalid_arguments' },
      });
      assert.equal(x.rows(), 0);
      assert.equal(worker.calls.length, 0);
    } finally { x.close(); }
  });
}

test('closed store read returns unavailable without attempting reservation or execution', async () => {
  const x = fixture();
  try {
    closePublicSeoBudgetStore(x.store);
    const worker = spy();
    assert.deepEqual(await runPublicSeoDiagnosis(options(x.store, worker.executor)), {
      reservation: { status: 'unavailable' },
    });
    assert.equal(worker.calls.length, 0);
  } finally { x.close(); }
});

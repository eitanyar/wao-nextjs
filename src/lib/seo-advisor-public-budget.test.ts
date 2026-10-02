import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  closePublicSeoBudgetStore, openPublicSeoBudgetStore, readPublicSeoOverview,
  reservePublicSeoOverview, savePublicSeoOverview,
  type PublicSeoReservation,
} from './seo-advisor-public-budget';

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'public-seo-budget-'));
  const dbPath = path.join(dir, 'gate.sqlite');
  let clock = '2026-10-02T12:00:00.000Z';
  const now = () => new Date(clock);
  const a = openPublicSeoBudgetStore({ dbPath, now });
  const b = openPublicSeoBudgetStore({ dbPath, now });
  return {
    a, b, dbPath, setClock(value: string) { clock = value; },
    close() { closePublicSeoBudgetStore(a); closePublicSeoBudgetStore(b); fs.rmSync(dir, { recursive: true, force: true }); },
  };
}
function token(result: PublicSeoReservation): string {
  assert.equal(result.status, 'reserved');
  return (result as Extract<PublicSeoReservation, { status: 'reserved' }>).token;
}
const finding = { retrievedAt: '2026-10-02T11:00:00.000Z', organicTraffic: 42, organicKeywords: null };

// Opening the module has no side effects; only the explicit open creates a DB.
test('import performs no I/O and an explicit external absolute path is required', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'public-seo-import-'));
  try {
    const target = path.join(dir, 'never-created.sqlite');
    assert.equal(fs.existsSync(target), false);
    assert.throws(() => openPublicSeoBudgetStore({ dbPath: 'relative.sqlite' }));
    assert.equal(fs.existsSync(target), false);
    assert.throws(() => openPublicSeoBudgetStore({ dbPath: path.join(process.cwd(), 'budget.sqlite') }));
    assert.equal(fs.existsSync(path.join(process.cwd(), 'budget.sqlite')), false);
    const handle = openPublicSeoBudgetStore({ dbPath: target });
    assert.equal(fs.existsSync(target), true);
    closePublicSeoBudgetStore(handle);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('two independent handles authorize exactly one funded reservation and normalize aliases', async () => {
  const x = fixture();
  try {
    const results = await Promise.all([
      Promise.resolve().then(() => reservePublicSeoOverview(x.a, ' Example.TEST ', 600)),
      Promise.resolve().then(() => reservePublicSeoOverview(x.b, 'example.test', 600)),
    ]);
    assert.deepEqual(results.map(result => result.status).sort(), ['already_reserved', 'reserved']);
    assert.equal(reservePublicSeoOverview(x.b, ' EXAMPLE.TEST ', 600).status, 'already_reserved');
    assert.equal(readPublicSeoOverview(x.b, 'example.test').status, 'not_found');
  } finally { x.close(); }
});

test('daily ceiling is shared, durable, and rolls over at UTC midnight', () => {
  const x = fixture();
  try {
    token(reservePublicSeoOverview(x.a, 'one.test', 300));
    assert.equal(reservePublicSeoOverview(x.b, 'two.test', 300).status, 'budget_exhausted');
    assert.equal(reservePublicSeoOverview(x.b, 'one.test', 300).status, 'already_reserved');
    x.setClock('2026-10-02T23:59:59.999Z');
    assert.equal(reservePublicSeoOverview(x.b, 'two.test', 300).status, 'budget_exhausted');
    x.setClock('2026-10-03T00:00:00.000Z');
    token(reservePublicSeoOverview(x.b, 'two.test', 300));
    assert.equal(reservePublicSeoOverview(x.a, 'one.test', 300).status, 'budget_exhausted');
  } finally { x.close(); }
});

test('competing domains on separate handles cannot oversubscribe a one-call ceiling', async () => {
  const x = fixture();
  try {
    const results = await Promise.all([
      Promise.resolve().then(() => reservePublicSeoOverview(x.a, 'one.test', 300)),
      Promise.resolve().then(() => reservePublicSeoOverview(x.b, 'two.test', 300)),
    ]);
    assert.deepEqual(results.map(result => result.status).sort(), ['budget_exhausted', 'reserved']);
  } finally { x.close(); }
});

test('pending, failed save, and reopened connections do not refund or retry', () => {
  const x = fixture();
  try {
    const t = token(reservePublicSeoOverview(x.a, 'one.test', 300));
    assert.equal(savePublicSeoOverview(x.b, 'one.test', t, { ...finding, payload: 'secret' }), false);
    assert.equal(reservePublicSeoOverview(x.b, 'one.test', 300).status, 'already_reserved');
    closePublicSeoBudgetStore(x.a);
    const reopened = openPublicSeoBudgetStore({ dbPath: x.dbPath, now: () => new Date('2026-10-02T12:00:00.000Z') });
    try {
      assert.equal(reservePublicSeoOverview(reopened, 'one.test', 300).status, 'already_reserved');
      assert.equal(reservePublicSeoOverview(reopened, 'two.test', 300).status, 'budget_exhausted');
    } finally { closePublicSeoBudgetStore(reopened); }
  } finally { x.close(); }
});

test('same-day cache is reused; next-day evidence is explicitly stale and dated', () => {
  const x = fixture();
  try {
    const t = token(reservePublicSeoOverview(x.a, 'one.test', 300));
    assert.equal(savePublicSeoOverview(x.b, ' ONE.TEST ', t, finding), true);
    assert.equal(savePublicSeoOverview(x.a, 'one.test', t, finding), false);
    assert.deepEqual(reservePublicSeoOverview(x.b, 'one.test', 300), { status: 'cached', domain: 'one.test', day: '2026-10-02', finding });
    assert.deepEqual(readPublicSeoOverview(x.a, 'one.test'), { status: 'found', domain: 'one.test', day: '2026-10-02', stale: false, finding });
    x.setClock('2026-10-02T10:00:00.000Z');
    assert.equal(readPublicSeoOverview(x.a, 'one.test').status, 'not_found');
    assert.equal(reservePublicSeoOverview(x.b, 'one.test', 300).status, 'already_reserved');
    x.setClock('2026-10-03T10:00:00.000Z');
    assert.deepEqual(readPublicSeoOverview(x.b, 'one.test'), { status: 'found', domain: 'one.test', day: '2026-10-02', stale: true, finding });
    token(reservePublicSeoOverview(x.a, 'one.test', 300));
    assert.equal(reservePublicSeoOverview(x.b, 'one.test', 300).status, 'already_reserved');
  } finally { x.close(); }
});

test('expired reservation tokens cannot publish on a later UTC day', () => {
  const x = fixture();
  try {
    const t = token(reservePublicSeoOverview(x.a, 'one.test', 300));
    x.setClock('2026-10-03T00:00:00.000Z');
    assert.equal(savePublicSeoOverview(x.b, 'one.test', t, finding), false);
    assert.equal(readPublicSeoOverview(x.a, 'one.test').status, 'not_found');
    token(reservePublicSeoOverview(x.b, 'one.test', 300));
  } finally { x.close(); }
});

test('invalid domains, ceilings, and malformed findings fail closed without charges', () => {
  const x = fixture();
  try {
    for (const domain of ['https://one.test', 'one.test/path', 'one.test?q=x', 'one.test:443', 'a@one.test', '127.0.0.1', '[::1]', 'localhost', '-a.test', 'a-.test', 'a..test', 'a'.repeat(64) + '.test', 'a'.repeat(250) + '.test', 'one.test.', 'one_test.test']) {
      assert.equal(reservePublicSeoOverview(x.a, domain, 300).status, 'invalid_arguments', domain);
      assert.equal(readPublicSeoOverview(x.a, domain).status, 'invalid_arguments', domain);
    }
    for (const cap of [0, -1, 299, NaN, Infinity, 300.5, '300', Number.MAX_SAFE_INTEGER + 1]) {
      const status = reservePublicSeoOverview(x.a, 'one.test', cap as number).status;
      assert.equal(status, cap === 299 ? 'budget_exhausted' : 'invalid_arguments');
    }
    const t = token(reservePublicSeoOverview(x.a, 'one.test', 300));
    for (const bad of [
      { ...finding, email: 'private@example.test' }, { ...finding, payload: {} }, { ...finding, credits: 300 },
      { ...finding, organicTraffic: -1 }, { ...finding, organicTraffic: Infinity },
      { ...finding, organicKeywords: '12' }, { ...finding, retrievedAt: '2026-10-01T11:00:00.000Z' },
      { ...finding, retrievedAt: '2026-10-02T13:00:00.000Z' },
      { organicTraffic: 1, organicKeywords: 2 },
    ]) assert.equal(savePublicSeoOverview(x.a, 'one.test', t, bad), false);
    assert.equal(savePublicSeoOverview(x.a, 'two.test', t, finding), false);
    assert.equal(savePublicSeoOverview(x.a, 'one.test', 'wrong', finding), false);
    assert.equal(readPublicSeoOverview(x.b, 'one.test').status, 'not_found');
    assert.equal(reservePublicSeoOverview(x.b, 'two.test', 300).status, 'budget_exhausted');
  } finally { x.close(); }
});

test('closed storage fails closed on all operations', () => {
  const x = fixture();
  try {
    closePublicSeoBudgetStore(x.a);
    assert.equal(reservePublicSeoOverview(x.a, 'one.test', 300).status, 'unavailable');
    assert.equal(savePublicSeoOverview(x.a, 'one.test', '11111111-1111-1111-1111-111111111111', finding), false);
    assert.equal(readPublicSeoOverview(x.a, 'one.test').status, 'unavailable');
  } finally { x.close(); }
});

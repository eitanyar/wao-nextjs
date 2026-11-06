import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  closeSiteBotAuditLookupBudget, openSiteBotAuditLookupBudget,
  parseSiteBotAuditDailyCeiling, reserveSiteBotAuditLookup,
} from './auditLookupBudget';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'site-bot-budget-'));
  const dbPath = path.join(root, 'budget.sqlite');
  let current = '2026-10-05T23:59:59.999Z';
  const now = () => new Date(current);
  const a = openSiteBotAuditLookupBudget(dbPath, now);
  const b = openSiteBotAuditLookupBudget(dbPath, now);
  return { root, dbPath, a, b, setClock(value: string) { current = value; },
    close() { closeSiteBotAuditLookupBudget(a); closeSiteBotAuditLookupBudget(b); fs.rmSync(root, { recursive: true, force: true }); } };
}

test('strict operator config and path validation fail closed without opening a DB', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'site-bot-budget-invalid-'));
  try {
    for (const value of [undefined, '', '0', '-1', ' 4', '4 ', '+4', '04', '1.5', 'Infinity', '9007199254740992']) {
      assert.equal(parseSiteBotAuditDailyCeiling(value), null);
    }
    assert.equal(parseSiteBotAuditDailyCeiling('9007199254740991'), Number.MAX_SAFE_INTEGER);
    const dbPath = path.join(root, 'budget.sqlite');
    assert.throws(() => openSiteBotAuditLookupBudget('relative.sqlite'));
    assert.throws(() => openSiteBotAuditLookupBudget(path.join(process.cwd(), 'budget.sqlite')));
    assert.throws(() => openSiteBotAuditLookupBudget(path.join(root, 'missing', 'budget.sqlite')));
    assert.equal(fs.existsSync(dbPath), false);
    const linked = path.join(root, 'linked.sqlite');
    fs.symlinkSync(dbPath, linked);
    assert.throws(() => openSiteBotAuditLookupBudget(linked));
    fs.symlinkSync(dbPath, dbPath + '-wal');
    assert.throws(() => openSiteBotAuditLookupBudget(dbPath));
    fs.unlinkSync(dbPath + '-wal');
    const alias = path.join(root, 'alias');
    fs.symlinkSync(root, alias);
    assert.throws(() => openSiteBotAuditLookupBudget(path.join(alias, 'other.sqlite')));
    fs.mkdirSync(path.join(root, 'directory.sqlite'));
    assert.throws(() => openSiteBotAuditLookupBudget(path.join(root, 'directory.sqlite')));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('four-slot reservations contend atomically across independent handles, survive reopen and failed search', async () => {
  const x = fixture();
  let reopened;
  try {
    const results = await Promise.all([
      Promise.resolve().then(() => reserveSiteBotAuditLookup(x.a, 9).status),
      Promise.resolve().then(() => reserveSiteBotAuditLookup(x.b, 9).status),
      Promise.resolve().then(() => reserveSiteBotAuditLookup(x.a, 9).status),
    ]);
    assert.deepEqual(results.sort(), ['exhausted', 'reserved', 'reserved']);
    // No refund when provider search fails; the same day is exhausted even on another handle.
    reopened = openSiteBotAuditLookupBudget(x.dbPath, () => new Date('2026-10-05T23:59:59.999Z'));
    assert.equal(reserveSiteBotAuditLookup(reopened, 9).status, 'exhausted');
    assert.equal(reserveSiteBotAuditLookup(x.b, 4).status, 'exhausted');
    x.setClock('2026-10-06T00:00:00.000Z');
    assert.equal(reserveSiteBotAuditLookup(x.b, 4).status, 'reserved');
    assert.equal(reserveSiteBotAuditLookup(x.a, 4).status, 'exhausted');
  } finally { if (reopened) closeSiteBotAuditLookupBudget(reopened); x.close(); }
});

test('invalid ceilings, clocks, closed handles and a locked ledger never authorize a search', () => {
  const x = fixture();
  try {
    for (const ceiling of [0, -1, 2.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      assert.equal(reserveSiteBotAuditLookup(x.a, ceiling).status, 'unavailable');
    }
    assert.equal(reserveSiteBotAuditLookup(x.a, 3).status, 'exhausted');
    x.setClock('invalid');
    assert.equal(reserveSiteBotAuditLookup(x.a, 4).status, 'unavailable');
    x.setClock('2026-10-05T23:59:59.999Z');
    x.a.db.exec('BEGIN IMMEDIATE');
    try { assert.equal(reserveSiteBotAuditLookup(x.b, 4).status, 'unavailable'); }
    finally { x.a.db.exec('ROLLBACK'); }
    closeSiteBotAuditLookupBudget(x.a);
    assert.equal(reserveSiteBotAuditLookup(x.a, 4).status, 'unavailable');
  } finally { x.close(); }
});

test('corrupt SQLite bytes and incompatible schema cannot issue a reservation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'site-bot-budget-corrupt-'));
  try {
    const bad = path.join(root, 'bad.sqlite');
    fs.writeFileSync(bad, 'not a SQLite database');
    assert.throws(() => openSiteBotAuditLookupBudget(bad));
    const schema = path.join(root, 'schema.sqlite');
    const store = openSiteBotAuditLookupBudget(schema);
    store.db.exec('DROP TABLE site_bot_audit_lookup_budget; CREATE TABLE site_bot_audit_lookup_budget (day TEXT, used TEXT)');
    closeSiteBotAuditLookupBudget(store);
    assert.throws(() => openSiteBotAuditLookupBudget(schema));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('Places search attempt bound is pinned until four-slot reservation is reconsidered', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/places/client.ts'), 'utf8');
  const search = source.slice(source.indexOf('export async function searchPlacesByName('));
  assert.match(search, /body: JSON\.stringify\(\{ textQuery, languageCode: 'he', regionCode: 'IL', pageSize: 3 \}\)/);
  assert.equal((search.match(/await fetch\(/g) ?? []).length, 1);
  assert.equal((search.match(/await getPlacePhotos\(/g) ?? []).length, 1);
  assert.match(search, /for \(const p of places\)/);
});

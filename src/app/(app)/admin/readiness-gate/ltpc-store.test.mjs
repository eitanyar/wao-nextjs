import assert from 'node:assert/strict';
import test   from 'node:test';
import { applyLtpcSubmission } from './ltpc-store.js';

function formData(fields) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

function makeDeps({ existingRecord = null, exists = true } = {}) {
  const writes = [];
  const audits = [];
  return {
    clientExists: () => exists,
    loadRecord: () => existingRecord,
    writeRecord: (clientId, record) => writes.push({ clientId, record }),
    appendAudit: (clientId, entry) => audits.push({ clientId, entry }),
    now: () => '2026-08-07T12:00:00.000Z',
    writes,
    audits,
  };
}

// ── #13 — pass with empty evidence is rejected, not written ────────────
test('#13 — a "pass" submission with empty evidence is rejected before any write', async () => {
  const deps = makeDeps();
  const result = await applyLtpcSubmission({
    formData: formData({
      clientId: 'test-client',
      botType: 'site-bot',
      checkedBy: 'Eitan',
      'status-contact-inventory': 'pass',
      'evidence-contact-inventory': '',
    }),
    ...deps,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'missing-evidence');
  assert.equal(deps.writes.length, 0);
  assert.equal(deps.audits.length, 0);
});

// ── #14 — valid pass persists + appends audit ───────────────────────────
test('#14 — a valid "pass" with evidence persists to the record and appends one audit entry', async () => {
  const deps = makeDeps();
  const result = await applyLtpcSubmission({
    formData: formData({
      clientId: 'test-client',
      botType: 'site-bot',
      checkedBy: 'Eitan',
      'status-contact-inventory': 'pass',
      'evidence-contact-inventory': 'clicked WhatsApp CTA, saw lead #47 appear within 2s',
    }),
    ...deps,
  });

  assert.equal(result.ok, true);
  assert.equal(deps.writes.length, 1);
  const written = deps.writes[0].record;
  const item = written.items.find(i => i.id === 'contact-inventory');
  assert.equal(item.status, 'pass');
  assert.equal(item.checkedBy, 'Eitan');
  assert.equal(item.checkedAt, '2026-08-07T12:00:00.000Z');
  assert.match(item.evidence, /lead #47/);

  assert.equal(deps.audits.length, 1);
  assert.equal(deps.audits[0].clientId, 'test-client');
  assert.deepEqual(deps.audits[0].entry.changes, [{ id: 'contact-inventory', from: 'not-checked', to: 'pass' }]);
});

test('rejects (with no write) when the target client dir does not exist', async () => {
  const deps = makeDeps({ exists: false });
  const result = await applyLtpcSubmission({
    formData: formData({ clientId: 'ghost-client', botType: 'site-bot' }),
    ...deps,
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'unknown-client');
  assert.equal(deps.writes.length, 0);
});

// ── #15 — overallPass flips both directions on real persisted records ──
test('#15 — overallPass is false until every universal item (site-bot) is pass, then flips true; regressing one flips it back false', async () => {
  const deps = makeDeps();

  const ITEMS = ['contact-inventory', 'delivery-reliability', 'intake-integrity', 'no-unauth-exposure', 'grading-path', 'downstream-integrations'];

  // Pass five of six.
  const fields1 = { clientId: 'test-client', botType: 'site-bot', checkedBy: 'Eitan' };
  for (const id of ITEMS.slice(0, 5)) {
    fields1[`status-${id}`] = 'pass';
    fields1[`evidence-${id}`] = `evidence for ${id}`;
  }
  fields1[`status-${ITEMS[5]}`] = 'not-checked';
  let result = await applyLtpcSubmission({ formData: formData(fields1), ...deps });
  assert.equal(result.ok, true);
  assert.equal(result.record.overallPass, false);

  // Now submit all six as pass, loading the previous record as "existing".
  deps.loadRecord = () => deps.writes[deps.writes.length - 1].record;
  const fields2 = { clientId: 'test-client', botType: 'site-bot', checkedBy: 'Eitan' };
  for (const id of ITEMS) {
    fields2[`status-${id}`] = 'pass';
    fields2[`evidence-${id}`] = `evidence for ${id}`;
  }
  result = await applyLtpcSubmission({ formData: formData(fields2), ...deps });
  assert.equal(result.ok, true);
  assert.equal(result.record.overallPass, true);

  // Regress one item back to fail.
  deps.loadRecord = () => deps.writes[deps.writes.length - 1].record;
  const fields3 = { clientId: 'test-client', botType: 'site-bot', checkedBy: 'Eitan' };
  for (const id of ITEMS) {
    fields3[`status-${id}`] = id === ITEMS[0] ? 'fail' : 'pass';
    if (id !== ITEMS[0]) fields3[`evidence-${id}`] = `evidence for ${id}`;
  }
  result = await applyLtpcSubmission({ formData: formData(fields3), ...deps });
  assert.equal(result.ok, true);
  assert.equal(result.record.overallPass, false);
});

test('a submission that changes botType (with no item status changes) still logs an audit entry', async () => {
  const existingRecord = {
    botType: 'site-bot',
    items: [{ id: 'contact-inventory', status: 'pass', checkedBy: 'Eitan', checkedAt: 't0', evidence: 'x' }],
    overallPass: false,
  };
  const deps = makeDeps({ existingRecord });
  const fields = { clientId: 'test-client', botType: 'ads-bot', checkedBy: 'Eitan', 'status-contact-inventory': 'pass', 'evidence-contact-inventory': 'x' };
  const result = await applyLtpcSubmission({ formData: formData(fields), ...deps });
  assert.equal(result.ok, true);
  assert.equal(deps.audits.length, 1);
});

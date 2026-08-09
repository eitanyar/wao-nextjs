import assert from 'node:assert/strict';
import test   from 'node:test';
import {
  UNIVERSAL_ITEM_IDS,
  BOT_TYPES,
  applicableItemIds,
  parseLtpcSubmission,
  computeOverallPass,
} from './ltpc-form.js';

function formData(fields) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

test('UNIVERSAL_ITEM_IDS is exactly the six universal LTPC items (readiness-gate.md §5.2)', () => {
  assert.deepEqual(UNIVERSAL_ITEM_IDS, [
    'contact-inventory',
    'delivery-reliability',
    'intake-integrity',
    'no-unauth-exposure',
    'grading-path',
    'downstream-integrations',
  ]);
});

test('applicableItemIds: site-bot has no bot-specific extras (timing differs, not content, §5.3)', () => {
  assert.deepEqual(applicableItemIds('site-bot'), UNIVERSAL_ITEM_IDS);
});

test('applicableItemIds: ads-bot adds gclid-capture', () => {
  assert.deepEqual(applicableItemIds('ads-bot'), [...UNIVERSAL_ITEM_IDS, 'gclid-capture']);
});

test('applicableItemIds: geo-bot and content-bot both add geo-action-log', () => {
  assert.deepEqual(applicableItemIds('geo-bot'), [...UNIVERSAL_ITEM_IDS, 'geo-action-log']);
  assert.deepEqual(applicableItemIds('content-bot'), [...UNIVERSAL_ITEM_IDS, 'geo-action-log']);
});

test('BOT_TYPES exposes exactly the five known bot types', () => {
  assert.deepEqual([...BOT_TYPES].sort(), ['ads-bot', 'content-bot', 'geo-bot', 'gmb-bot', 'site-bot']);
});

// ── §5.4 — evidence, not bare checkboxes ────────────────────────────────
test('#13 — rejects an item marked "pass" with an empty evidence field', () => {
  const result = parseLtpcSubmission(formData({
    clientId: 'test-plumber-tlv',
    botType: 'site-bot',
    checkedBy: 'Eitan',
    'status-contact-inventory': 'pass',
    'evidence-contact-inventory': '   ',
  }));

  assert.equal(result.ok, false);
  assert.equal(result.error, 'missing-evidence');
  assert.equal(result.itemId, 'contact-inventory');
});

test('rejects a "pass" item when the global "checked by" field is empty', () => {
  const result = parseLtpcSubmission(formData({
    clientId: 'test-plumber-tlv',
    botType: 'site-bot',
    'status-contact-inventory': 'pass',
    'evidence-contact-inventory': 'observed lead #47 appear within 2s',
  }));

  assert.equal(result.ok, false);
  assert.equal(result.error, 'missing-checked-by');
});

test('accepts a valid submission with evidence and checkedBy for a passing item', () => {
  const result = parseLtpcSubmission(formData({
    clientId: 'test-plumber-tlv',
    botType: 'site-bot',
    checkedBy: 'Eitan',
    'status-contact-inventory': 'pass',
    'evidence-contact-inventory': 'clicked WhatsApp CTA on live retter.co.il, saw lead #47 appear within 2s',
  }));

  assert.equal(result.ok, true);
  assert.equal(result.clientId, 'test-plumber-tlv');
  assert.equal(result.botType, 'site-bot');
  const item = result.items.find(i => i.id === 'contact-inventory');
  assert.equal(item.status, 'pass');
  assert.ok(item.evidence.length > 0);
});

test('fail/not-checked items never require evidence', () => {
  const result = parseLtpcSubmission(formData({
    clientId: 'test-plumber-tlv',
    botType: 'site-bot',
    'status-contact-inventory': 'fail',
    'status-delivery-reliability': 'not-checked',
  }));
  assert.equal(result.ok, true);
});

test('rejects an invalid clientId (path-traversal / crafted input hardening)', () => {
  for (const badId of ['../../etc', 'client id with spaces', '', 'client/../x']) {
    const result = parseLtpcSubmission(formData({ clientId: badId, botType: 'site-bot' }));
    assert.equal(result.ok, false);
    assert.equal(result.error, 'invalid-client');
  }
});

test('rejects an invalid/unknown botType', () => {
  const result = parseLtpcSubmission(formData({ clientId: 'test-client', botType: 'not-a-real-bot' }));
  assert.equal(result.ok, false);
  assert.equal(result.error, 'invalid-bot-type');
});

test('only reads items applicable to the submitted botType — a gclid-capture field submitted for a site-bot client is ignored', () => {
  const result = parseLtpcSubmission(formData({
    clientId: 'test-client',
    botType: 'site-bot',
    'status-gclid-capture': 'fail', // not applicable to site-bot — must not appear in items
  }));
  assert.equal(result.ok, true);
  assert.equal(result.items.some(i => i.id === 'gclid-capture'), false);
});

// ── computeOverallPass — both directions, #15 ───────────────────────────
test('#15 — overallPass is false while any applicable item is not-checked or fail', () => {
  const items = UNIVERSAL_ITEM_IDS.map(id => ({ id, status: 'pass' }));
  items[items.length - 1].status = 'not-checked';
  assert.equal(computeOverallPass(items, 'site-bot'), false);

  items[items.length - 1].status = 'fail';
  assert.equal(computeOverallPass(items, 'site-bot'), false);
});

test('#15 — overallPass flips true once every applicable item (universal + bot-specific) is pass, and flips back false on regression', () => {
  const items = [...UNIVERSAL_ITEM_IDS, 'gclid-capture'].map(id => ({ id, status: 'pass' }));
  assert.equal(computeOverallPass(items, 'ads-bot'), true);

  // regress one item
  items[0].status = 'not-checked';
  assert.equal(computeOverallPass(items, 'ads-bot'), false);

  // flip it back
  items[0].status = 'pass';
  assert.equal(computeOverallPass(items, 'ads-bot'), true);
});

test('overallPass ignores items not applicable to the client\'s botType (e.g. gclid-capture missing for a site-bot client is fine)', () => {
  const items = UNIVERSAL_ITEM_IDS.map(id => ({ id, status: 'pass' }));
  assert.equal(computeOverallPass(items, 'site-bot'), true);
});

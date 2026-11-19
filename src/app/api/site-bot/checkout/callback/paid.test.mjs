// Checkout callback session-link hook (spec acceptance 19). The paid handler is loaded with mocked activation and
// research modules and a REAL client-message store on a temp DB; the pending file lives in a temp cwd.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { load, makeStore, recordingConsole } from '../../client-message/clientMessage.testkit.mjs';

const sessionId = '123e4567-e89b-42d3-a456-426614174000';

function harness({ linkThrows = false, alreadyActive = false, gates = [], record = async (_id, list) => list, activation = null, consentThrows = false, activationThrows = false, researchThrows = false, dossier = null } = {}) {
  const activationCalls = [];
  const recordCalls = [];
  const consentCalls = [];
  const s = makeStore();
  const subscriptionId = s.addSubscription();
  const cwd = fs.mkdtempSync(path.join(s.dir, 'cwd-'));
  const pendingDir = path.join(cwd, 'data', 'sites-pending');
  fs.mkdirSync(pendingDir, { recursive: true });
  const pending = { subscriptionId, createdAt: new Date().toISOString(), collectedData: { businessName: 'Acme Plumbing', ownerContact: { mobile: '+972501234567', email: 'owner@example.com' } } };
  fs.writeFileSync(path.join(pendingDir, `${sessionId}.json`), JSON.stringify(pending));
  const logs = recordingConsole();
  const alerts = [];
  const store = linkThrows ? { ...s.store, linkSiteBotSession: () => { throw new Error('db locked'); } } : s.store;
  const paid = load('src/app/api/site-bot/checkout/callback/paid.ts', {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    fs, path,
    '@/lib/payments/subscriptions': { activatePlanSubscription: async (...args) => { activationCalls.push(args); if (activationThrows) throw new Error('db write failed'); return activation ?? { ok: true, alreadyActive }; }, issueAccountPath: () => `/account/subscription?token=${'a'.repeat(64)}` },
    '@/lib/site-bot/research/gates': { deriveOpenResearchGates: () => gates },
    '@/lib/site-bot/research/ownerGates': { recordOwnerResearchGates: async (id, list) => { recordCalls.push([id, list]); return record(id, list); } },
    '@/lib/site-bot/research/researchStore': { readResearchDossier: async () => dossier },
    '@/lib/site-bot/research/runResearch': { runSiteResearch: async () => ({}) },
    '@/lib/site-bot/checkout/researchCompletion': { completePaidCheckoutResearch: async (params) => { if (researchThrows) throw new Error('research crashed'); return { success: true, charged: true, researchId: sessionId, collectedData: params.collectedData, openResearchGates: params.openResearchGates }; } },
    '@/lib/site-bot/research/researchInput': { buildSiteResearchInput: () => ({}) },
    '@/lib/site-bot/clientMessages': store,
    '@/lib/site-bot/paidQueueAlert': { sendPaidQueueAlert: async (input) => { alerts.push(input); return true; } },
    '@/lib/showcase/consentStore': { recordShowcaseConsent: (params) => { if (consentThrows) throw new Error('disk full'); consentCalls.push(params); return { granted: true }; } },
  }, { cwd, console: logs.console });
  const call = (extra = {}) => paid.POST(new Request('http://localhost/api/site-bot/checkout/callback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId, ...extra }) }));
  const events = () => s.db.prepare(`SELECT metadata FROM subscription_events WHERE subscription_id = ? AND event_type = 'site_bot_session_linked'`).all(subscriptionId);
  const paidPost = (id) => paid.POST(new Request('http://localhost/api/site-bot/checkout/callback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: id }) }));
  return { ...s, subscriptionId, call, paidPost, events, logs, alerts, recordCalls, consentCalls, activationCalls };
}

test('19: a successful activation writes exactly one site_bot_session_linked event with the business', async () => {
  const h = harness();
  const response = await h.call();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.ok(body.manageUrl);
  const events = h.events();
  assert.equal(events.length, 1);
  assert.deepEqual(JSON.parse(events[0].metadata), { sessionId, businessName: 'Acme Plumbing', ownerMobile: '+972501234567' });
  assert.deepEqual(h.store.resolveClientIdentity(h.subscriptionId).businessName, 'Acme Plumbing');
  h.cleanup();
});

test('19: a replayed callback (already active) writes no second event', async () => {
  const h = harness();
  await h.call();
  await h.call(); // the same callback again: the link event already exists
  assert.equal(h.events().length, 1);
  h.cleanup();
  const active = harness({ alreadyActive: true });
  await active.call();
  await active.call();
  assert.equal(active.events().length, 1, 'alreadyActive path: still exactly one');
  active.cleanup();
});

test('19: a throwing event insert still returns the normal success reply', async () => {
  const h = harness({ linkThrows: true });
  const response = await h.call();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
  assert.equal(h.events().length, 0);
  assert.ok(h.logs.lines.some((l) => l.includes('session link failed') && l.includes(sessionId)));
  h.cleanup();
});

test('callback rejects a non-UUID sessionId before touching the filesystem', async () => {
  const h = harness();
  for (const bad of ['../outside', '..%2Fx', 'abc', '', 42]) {
    const response = await h.paidPost(bad);
    assert.equal(response.status, 400, `sessionId ${JSON.stringify(bad)}`);
  }
  assert.equal(h.events().length, 0);
});

test('launch item 8: a fresh activation sends one paid-queue alert; an already-active replay sends none', async () => {
  const h = harness();
  await h.call();
  assert.equal(h.alerts.length, 1);
  assert.equal(h.alerts[0].sessionId, sessionId);
  assert.equal(h.alerts[0].subscriptionId, h.subscriptionId);
  assert.equal(h.alerts[0].collectedData.businessName, 'Acme Plumbing');
  h.cleanup();
  const active = harness({ alreadyActive: true });
  await active.call();
  assert.equal(active.alerts.length, 0);
  active.cleanup();
});

test('F2: the gates handed to the pay page are first recorded as owner gates in the dossier', async () => {
  const gate = { id: `${sessionId}:geography:abc`, type: 'geography', evidenceDigest: 'abc' };
  const h = harness({ gates: [gate] });
  const body = await (await h.call()).json();
  assert.deepEqual(h.recordCalls.map(([id, list]) => [id, list.map(item => item.id)]), [[sessionId, [gate.id]]]);
  assert.deepEqual(body.openResearchGates.map(item => item.id), [gate.id]);
  h.cleanup();
});

test('F2: if the owner gates cannot be recorded, the pay page gets no gates (done state) and the error is logged', async () => {
  const gate = { id: `${sessionId}:geography:abc`, type: 'geography', evidenceDigest: 'abc' };
  for (const record of [async () => [], async () => { throw new Error('disk full'); }]) {
    const h = harness({ gates: [gate], record });
    const response = await h.call();
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).openResearchGates, []);
    assert.ok(h.logs.lines.some((l) => l.includes('owner gates recorded 0/1')));
    h.cleanup();
  }
});

test('showcase consent: unticked (absent or false) pays normally and records nothing', async () => {
  for (const extra of [{}, { showcaseConsent: false }, { showcaseConsent: 'true' }]) {
    const h = harness();
    const response = await h.call(extra);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.ok(body.manageUrl);
    assert.equal(h.consentCalls.length, 0, JSON.stringify(extra));
    h.cleanup();
  }
});

test('showcase consent: ticked records one checkout grant for the subscription after the charge', async () => {
  const h = harness();
  const response = await h.call({ showcaseConsent: true });
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(h.consentCalls)), [{ accountId: h.subscriptionId, product: 'site-bot', source: 'checkout' }]);
  h.cleanup();
});

test('showcase consent: a failed charge records nothing; a failing store never fails the checkout', async () => {
  const failed = harness({ activation: { ok: false, reason: 'charge_failed', retryable: true } });
  assert.equal((await failed.call({ showcaseConsent: true })).status, 402);
  assert.equal(failed.consentCalls.length, 0);
  failed.cleanup();
  const throwing = harness({ consentThrows: true });
  const response = await throwing.call({ showcaseConsent: true });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
  assert.ok(throwing.logs.lines.some((l) => l.includes('showcase consent record failed') && l.includes(sessionId)));
  throwing.cleanup();
});

// 2026-11-20 (post-payment screen): every error reply says whether this call took money, so the pay page shows the right
// text and offers a retry only when it is safe.
test('chargeState: not_charged before / on a declined charge; charged after it; unknown when the activation itself throws', async () => {
  const bad = harness();
  const invalid = await bad.paidPost('not-a-uuid');
  assert.deepEqual(await invalid.json(), { error: 'invalid_input', chargeState: 'not_charged' });
  bad.cleanup();
  for (const [activation, error, status] of [
    [{ ok: false, reason: 'charge_failed', retryable: true }, 'charge_failed', 402],
    [{ ok: false, reason: 'callback_invalid' }, 'payment_verification_failed', 402],
    [{ ok: false, reason: 'subscription_not_pending' }, 'checkout_failed', 409],
  ]) {
    const h = harness({ activation });
    const response = await h.call();
    assert.equal(response.status, status);
    const body = await response.json();
    assert.equal(body.error, error);
    assert.equal(body.chargeState, 'not_charged', error);
    h.cleanup();
  }
  const after = harness({ researchThrows: true });
  const failedLater = await after.call();
  assert.equal(failedLater.status, 500);
  assert.deepEqual(await failedLater.json(), { error: 'checkout_failed', chargeState: 'charged' });
  after.cleanup();
  const inside = harness({ activationThrows: true });
  const unknown = await inside.call();
  assert.equal(unknown.status, 500);
  assert.deepEqual(await unknown.json(), { error: 'checkout_failed', chargeState: 'unknown' });
  inside.cleanup();
});

test('a second callback for a session that already has a dossier never reaches the charge', async () => {
  const h = harness({ dossier: { status: 'architecture_ready' } });
  const response = await h.call();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, charged: true, researchId: sessionId, status: 'architecture_ready' });
  assert.equal(h.activationCalls.length, 0, 'no activation, no charge');
  h.cleanup();
});

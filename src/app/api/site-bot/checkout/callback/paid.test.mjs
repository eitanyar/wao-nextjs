// Checkout callback session-link hook (spec acceptance 19). The paid handler is loaded with mocked activation and
// research modules and a REAL client-message store on a temp DB; the pending file lives in a temp cwd.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { load, makeStore, recordingConsole } from '../../client-message/clientMessage.testkit.mjs';

const sessionId = '123e4567-e89b-42d3-a456-426614174000';

function harness({ linkThrows = false, alreadyActive = false } = {}) {
  const s = makeStore();
  const subscriptionId = s.addSubscription();
  const cwd = fs.mkdtempSync(path.join(s.dir, 'cwd-'));
  const pendingDir = path.join(cwd, 'data', 'sites-pending');
  fs.mkdirSync(pendingDir, { recursive: true });
  const pending = { subscriptionId, createdAt: new Date().toISOString(), collectedData: { businessName: 'Acme Plumbing', ownerContact: { mobile: '+972501234567', email: 'owner@example.com' } } };
  fs.writeFileSync(path.join(pendingDir, `${sessionId}.json`), JSON.stringify(pending));
  const logs = recordingConsole();
  const store = linkThrows ? { ...s.store, linkSiteBotSession: () => { throw new Error('db locked'); } } : s.store;
  const paid = load('src/app/api/site-bot/checkout/callback/paid.ts', {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    fs, path,
    '@/lib/payments/subscriptions': { activatePlanSubscription: async () => ({ ok: true, alreadyActive }), issueAccountPath: () => `/account/subscription?token=${'a'.repeat(64)}` },
    '@/lib/site-bot/research/gates': { deriveOpenResearchGates: () => [] },
    '@/lib/site-bot/research/researchStore': { readResearchDossier: async () => null },
    '@/lib/site-bot/research/runResearch': { runSiteResearch: async () => ({}) },
    '@/lib/site-bot/checkout/researchCompletion': { completePaidCheckoutResearch: async () => ({ success: true, charged: true, researchId: sessionId }) },
    '@/lib/site-bot/research/researchInput': { buildSiteResearchInput: () => ({}) },
    '@/lib/site-bot/clientMessages': store,
  }, { cwd, console: logs.console });
  const call = () => paid.POST(new Request('http://localhost/api/site-bot/checkout/callback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId }) }));
  const events = () => s.db.prepare(`SELECT metadata FROM subscription_events WHERE subscription_id = ? AND event_type = 'site_bot_session_linked'`).all(subscriptionId);
  return { ...s, subscriptionId, call, events, logs };
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

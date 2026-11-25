// Checkout callback session-link hook (spec acceptance 19). The paid handler is loaded with mocked activation and
// research modules and a REAL client-message store on a temp DB; the pending file lives in a temp cwd.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { load, makeStore, recordingConsole } from '../../client-message/clientMessage.testkit.mjs';

const sessionId = '123e4567-e89b-42d3-a456-426614174000';

function harness({ launchCount = 'recorded', linkThrows = false, alreadyActive = false, activation = null, consentThrows = false, activationThrows = false, researchThrows = false, dossier = null, pendingExtra = {}, writePending = true, dossiers = {}, boundInterview = null, inFlight = {} } = {}) {
  const activationCalls = [];
  const consentCalls = [];
  const researchRuns = [];
  const paidMarks = [];
  const awaited = [];
  const s = makeStore();
  const subscriptionId = s.addSubscription();
  const cwd = fs.mkdtempSync(path.join(s.dir, 'cwd-'));
  const pendingDir = path.join(cwd, 'data', 'sites-pending');
  fs.mkdirSync(pendingDir, { recursive: true });
  const pending = { subscriptionId, createdAt: new Date().toISOString(), collectedData: { businessName: 'Acme Plumbing', ownerContact: { mobile: '+972501234567', email: 'owner@example.com' } }, ...pendingExtra };
  if (writePending) fs.writeFileSync(path.join(pendingDir, `${sessionId}.json`), JSON.stringify(pending));
  const logs = recordingConsole();
  const alerts = [];
  const launchCounts = [];
  const store = linkThrows ? { ...s.store, linkSiteBotSession: () => { throw new Error('db locked'); } } : s.store;
  const paid = load('src/app/api/site-bot/checkout/callback/paid.ts', {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    fs, path,
    '@/lib/payments/subscriptions': { activatePlanSubscription: async (...args) => { activationCalls.push(args); if (activationThrows) throw new Error('db write failed'); return activation ?? { ok: true, alreadyActive }; }, issueAccountPath: () => `/account/subscription?token=${'a'.repeat(64)}` },
    '@/lib/site-bot/research/researchStore': { readResearchDossier: async (id) => dossiers[id] ?? (id === sessionId ? dossier : null) },
    '@/lib/site-bot/research/runResearch': { runSiteResearch: async (id) => { researchRuns.push(id); return { dossier: { status: 'architecture_ready', humanGates: [] } }; } },
    // Step 2a: the completion helper is stubbed, but it runs the handler's own research step so its choice is observable.
    '@/lib/site-bot/checkout/researchCompletion': { completePaidCheckoutResearch: async (params) => {
      if (researchThrows) throw new Error('research crashed');
      const result = await params.runResearch();
      return { success: true, charged: true, researchId: params.researchId ?? sessionId, status: result?.dossier?.status, collectedData: params.collectedData, ...(params.openResearchGates ? { openResearchGates: params.openResearchGates } : {}) };
    } },
    '@/lib/site-bot/research/researchInput': { buildSiteResearchInput: () => ({}) },
    '@/lib/site-bot/clientMessages': store,
    '@/lib/site-bot/paidQueueAlert': { sendPaidQueueAlert: async (input) => { alerts.push(input); return true; } },
    // Launch step 1: fresh activations count toward the launch cap (stubbed store; launchStore.test.ts covers the real one).
    '@/lib/site-bot/launchStore': {
      withLaunchStore: (fn, fallback) => { try { return fn({ synthetic: true }); } catch { return fallback; } },
      recordPaidSignup: (_store, id) => { launchCounts.push(id); if (launchCount === 'throw') throw new Error('db locked'); return { status: launchCount }; },
    },
    // Step 2a: the interview session the checkout came from (stubbed; interviewFlow.test.ts covers the real store).
    '@/lib/site-bot/interviewSession': {
      markInterviewPaid: (_store, id) => { paidMarks.push(id); return true; },
      sessionForCheckout: (_store, id) => (boundInterview && id === sessionId ? boundInterview : null),
    },
    '@/lib/site-bot/interviewResearch': { inFlightInterviewResearch: (id) => { if (inFlight[id]) { awaited.push(id); return inFlight[id](); } return undefined; } },
    '@/lib/showcase/consentStore': { recordShowcaseConsent: (params) => { if (consentThrows) throw new Error('disk full'); consentCalls.push(params); return { granted: true }; } },
  }, { cwd, console: logs.console });
  const call = (extra = {}) => paid.POST(new Request('http://localhost/api/site-bot/checkout/callback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId, ...extra }) }));
  const events = () => s.db.prepare(`SELECT metadata FROM subscription_events WHERE subscription_id = ? AND event_type = 'site_bot_session_linked'`).all(subscriptionId);
  const paidPost = (id) => paid.POST(new Request('http://localhost/api/site-bot/checkout/callback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: id }) }));
  return { ...s, subscriptionId, call, paidPost, events, logs, alerts, consentCalls, activationCalls, launchCounts, researchRuns, paidMarks, awaited };
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

const interviewId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

test('step 2a: the pay page is handed no research gates (the owner answers them inside the interview now)', async () => {
  const h = harness();
  const body = await (await h.call()).json();
  assert.equal('openResearchGates' in body, false);
  h.cleanup();
});

test('step 2a: an interview checkout REUSES the pre-payment research: no second runSiteResearch, interview marked paid', async () => {
  const h = harness({
    pendingExtra: { interviewSessionId: interviewId, researchId: interviewId },
    dossiers: { [interviewId]: { status: 'architecture_ready', humanGates: [] } },
  });
  const response = await h.call();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.researchId, interviewId);
  assert.equal(body.status, 'architecture_ready');
  assert.deepEqual(h.researchRuns, [], 'no runSiteResearch for a session that already has a research');
  assert.deepEqual(h.paidMarks, [interviewId]);
  assert.equal(h.activationCalls.length, 1, 'the pre-payment dossier never short-circuits the charge');
  h.cleanup();
});

test('step 2a: a research still running in this process is awaited, then read; never started again', async () => {
  let settled = false;
  const dossiers = {};
  const h = harness({
    pendingExtra: { interviewSessionId: interviewId, researchId: interviewId },
    dossiers,
    inFlight: { [interviewId]: async () => { dossiers[interviewId] = { status: 'architecture_ready', humanGates: [] }; settled = true; } },
  });
  const body = await (await h.call()).json();
  assert.equal(settled, true);
  assert.deepEqual(h.awaited, [interviewId]);
  assert.equal(body.researchId, interviewId);
  assert.deepEqual(h.researchRuns, []);
  h.cleanup();
});

test('step 2a: fallback only for a session with no research: the post-pay run under the checkout session', async () => {
  const h = harness({ pendingExtra: { interviewSessionId: interviewId, researchId: null } });
  const body = await (await h.call()).json();
  assert.deepEqual(h.researchRuns, [sessionId]);
  assert.equal(body.researchId, sessionId);
  assert.deepEqual(h.paidMarks, [interviewId]);
  h.cleanup();
});

test('step 2a: a replay of a completed interview checkout (pending gone) answers from the bound session, no charge', async () => {
  const h = harness({
    writePending: false,
    boundInterview: { id: interviewId, status: 'paid', researchId: interviewId },
    dossiers: { [interviewId]: { status: 'architecture_ready', humanGates: [] } },
  });
  const response = await h.call();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, charged: true, researchId: interviewId, status: 'architecture_ready' });
  assert.equal(h.activationCalls.length, 0);
  assert.deepEqual(h.researchRuns, []);
  h.cleanup();
  const open = harness({ writePending: false, boundInterview: { id: interviewId, status: 'open', researchId: interviewId }, dossiers: { [interviewId]: { status: 'architecture_ready' } } });
  assert.equal((await open.call()).status, 404, 'an unpaid session is never answered as paid');
  open.cleanup();
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

test('launch step 1: a fresh activation counts one paid sign-up and flags paidSignup; a replay does neither', async () => {
  const fresh = harness();
  const body = await (await fresh.call()).json();
  assert.equal(body.paidSignup, true);
  assert.deepEqual(fresh.launchCounts, [sessionId]);
  fresh.cleanup();
  const replay = harness({ alreadyActive: true });
  const replayBody = await (await replay.call()).json();
  assert.equal('paidSignup' in replayBody, false);
  assert.deepEqual(replay.launchCounts, []);
  replay.cleanup();
});

test('launch step 1: a failed cap count is logged and never fails the paid checkout', async () => {
  const h = harness({ launchCount: 'throw' });
  const response = await h.call();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).paidSignup, true);
  h.cleanup();
});

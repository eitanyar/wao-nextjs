// Showcase consent toggle route: owner-only (magic-link peek), withdraw at once, grant from the account, refused after a
// cancellation. Real billing DB + REAL consent store on temp dirs. HEBREW-SAFETY: zero Hebrew bytes.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { jsonRequest, load, loadGuards, makeStore } from '../../site-bot/client-message/clientMessage.testkit.mjs';
import { loadDataRoots } from '../../../../lib/dataRoots.testkit.mjs';

const TOKEN = 'a'.repeat(64);

function harness({ status = 'active', plan = 'site-bot', cancelAtPeriodEnd = 0, tokenValid = true } = {}) {
  const s = makeStore();
  const subscriptionId = s.addSubscription({ status, plan });
  if (cancelAtPeriodEnd) s.db.prepare('UPDATE subscriptions SET cancel_at_period_end = 1 WHERE id = ?').run(subscriptionId);
  const consentDir = path.join(s.dir, 'showcase-consent');
  const copy = load('src/lib/showcase/consentCopy.generated.ts', {});
  const consentStore = load('src/lib/showcase/consentStore.ts', {
    crypto, fs, path,
    '../dataRoots': loadDataRoots({ cwd: s.dir, env: { WAO_SHOWCASE_CONSENT_DIR: consentDir } }),
    './consentCopy.generated': copy,
  });
  const rateLimit = load('src/lib/payments/rate-limit.ts', {});
  const route = load('src/app/api/showcase/consent/route.ts', {
    '@/lib/payments/magic-link': { peekMagicLinkToken: (token) => (tokenValid && token === TOKEN ? { valid: true, subscriptionId } : { valid: false, reason: 'invalid' }) },
    '@/lib/payments/subscriptions': {
      getSubscriptionById: s.getSubscriptionById,
      isCancellationRequested: (row) => row.status === 'canceled' || row.cancel_at_period_end === 1,
    },
    '@/lib/payments/plans': { SITE_BOT_PLAN: { id: 'site-bot' } },
    '@/lib/payments/rate-limit': rateLimit,
    '@/lib/site-bot/adminRequestGuards': loadGuards(),
    '@/lib/showcase/consentStore': consentStore,
  });
  const post = (body) => route.POST(jsonRequest('http://localhost/api/showcase/consent', body, { headers: { 'x-forwarded-for': crypto.randomUUID() } }));
  const consent = () => consentStore.getShowcaseConsent(subscriptionId);
  return { ...s, subscriptionId, post, consent, consentStore };
}

test('switching off records the withdrawal at once; switching on records an account grant', async () => {
  const h = harness();
  h.consentStore.recordShowcaseConsent({ accountId: h.subscriptionId, product: 'site-bot', source: 'checkout' });
  const off = await h.post({ token: TOKEN, granted: false });
  assert.equal(off.status, 200);
  assert.deepEqual(await off.json(), { ok: true, granted: false });
  assert.equal(h.consent().granted, false);
  assert.equal(h.consent().withdrawReason, 'owner_toggle');
  assert.equal(h.consent().source, 'account');
  const on = await h.post({ token: TOKEN, granted: true });
  assert.deepEqual(await on.json(), { ok: true, granted: true });
  assert.equal(h.consent().granted, true);
  assert.equal(h.consent().source, 'account');
  assert.deepEqual(JSON.parse(JSON.stringify(h.consent().history.map((e) => e.granted))), [true, false, true]);
  h.cleanup();
});

test('only the link holder can change it; bad input and other plans are refused', async () => {
  const h = harness();
  assert.equal((await h.post({ token: 'b'.repeat(64), granted: true })).status, 401);
  assert.equal((await h.post({ token: TOKEN, granted: 'yes' })).status, 400);
  assert.equal((await h.post({ token: TOKEN, granted: true, accountId: 'other' })).status, 400);
  assert.equal(h.consent(), null, 'nothing recorded');
  h.cleanup();
  for (const opts of [{ plan: null }, { status: 'pending' }]) {
    const other = harness(opts);
    assert.equal((await other.post({ token: TOKEN, granted: true })).status, 404, JSON.stringify(opts));
    other.cleanup();
  }
});

test('after a cancellation a grant is refused, a withdraw still works', async () => {
  const h = harness({ cancelAtPeriodEnd: 1 });
  assert.equal((await h.post({ token: TOKEN, granted: true })).status, 409);
  assert.equal(h.consent(), null);
  const off = await h.post({ token: TOKEN, granted: false });
  assert.deepEqual(await off.json(), { ok: true, granted: false });
  h.cleanup();
});

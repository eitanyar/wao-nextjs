// Site-Bot client message endpoint (spec acceptance 6-14). Real store on a temp SQLite DB; mocked email senders.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { jsonRequest, load, loadGuards, makeStore, mockEmail, recordingConsole, repo } from './clientMessage.testkit.mjs';

const URL_ = 'http://localhost/api/site-bot/client-message';
const VALID = 'a'.repeat(64);

function harness({ enabled = 'true', email = mockEmail(), tokens = {} } = {}) {
  const s = makeStore();
  const consumed = [];
  const logs = recordingConsole();
  const rateLimit = load('src/lib/payments/rate-limit.ts', {});
  const route = load('src/app/api/site-bot/client-message/route.ts', {
    '@/lib/payments/magic-link': {
      peekMagicLinkToken: (token) => tokens[token] ?? { valid: false, reason: 'not_found' },
      validateAndConsumeMagicLinkToken: (token) => { consumed.push(token); throw new Error('must never consume'); },
    },
    '@/lib/payments/subscriptions': { getSubscriptionById: s.getSubscriptionById },
    '@/lib/payments/plans': { SITE_BOT_PLAN: { id: 'site-bot' } },
    '@/lib/payments/rate-limit': rateLimit,
    '@/lib/site-bot/adminRequestGuards': loadGuards(),
    '@/lib/site-bot/clientMessages': s.store,
    '@/lib/site-bot/clientMessageEmail': email.module,
    '@/lib/site-bot/helpRequest': s.help,
  }, { env: enabled === 'unset' ? {} : { SITE_BOT_CLIENT_MESSAGES_ENABLED: enabled }, console: logs.console });
  const post = (body, opts = {}) => route.POST(jsonRequest(URL_, body, { headers: { 'x-forwarded-for': opts.ip ?? '10.0.0.1', ...(opts.headers ?? {}) }, raw: opts.raw }));
  return { ...s, route, post, email, consumed, logs };
}

async function json(response, status) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  return response.json();
}

function setup(overrides = {}, opts = {}) {
  const tokens = {};
  const h = harness({ ...opts, tokens });
  const subscriptionId = h.addSubscription(overrides);
  tokens[VALID] = { valid: true, subscriptionId };
  return { h, subscriptionId };
}

test('6: flag off -> 503 disabled and the request body is never read', async () => {
  for (const enabled of ['unset', 'false', 'TRUE', '1', '']) {
    const h = harness({ enabled });
    const trapped = new Proxy({}, { get: (_, key) => { throw new Error(`request.${String(key)} read`); } });
    assert.deepEqual(await json(await h.route.POST(trapped), 503), { ok: false, error: 'disabled' });
    assert.equal(h.rows().length, 0);
    h.cleanup();
  }
});

test('7: missing, expired or unknown token -> 401 link_expired; the token is only peeked, never consumed', async () => {
  const tokens = { expired: { valid: false, reason: 'expired' }, used: { valid: false, reason: 'already_consumed' } };
  const h = harness({ tokens });
  for (const token of ['', 'unknown', 'expired', 'used']) {
    assert.deepEqual(await json(await h.post({ token, messageId: crypto.randomUUID(), body: 'hi' }), 401), { ok: false, error: 'link_expired' });
  }
  const { h: ok, subscriptionId } = setup();
  await json(await ok.post({ token: VALID, messageId: crypto.randomUUID(), body: 'hello' }), 200);
  assert.deepEqual(ok.consumed, [], 'validateAndConsume never called');
  const source = fs.readFileSync(path.join(repo, 'src/app/api/site-bot/client-message/route.ts'), 'utf8');
  assert.ok(!source.includes('validateAndConsumeMagicLinkToken'), 'route never imports the consuming check');
  assert.ok(subscriptionId);
  h.cleanup(); ok.cleanup();
});

test('8: no plan or a pending subscription -> 404', async () => {
  for (const overrides of [{ plan: null }, { status: 'pending' }, { plan: 'other-plan' }]) {
    const { h } = setup(overrides);
    assert.deepEqual(await json(await h.post({ token: VALID, messageId: crypto.randomUUID(), body: 'hi' }), 404), { ok: false, error: 'not_found' });
    h.cleanup();
  }
});

test('9: active, past_due, paused, canceled and cancel-at-period-end clients can all write', async () => {
  for (const overrides of [{ status: 'active' }, { status: 'past_due' }, { status: 'paused' }, { status: 'canceled' }, { status: 'active', cancel_at_period_end: 1 }]) {
    const { h } = setup(overrides);
    const messageId = crypto.randomUUID();
    const body = await json(await h.post({ token: VALID, messageId, body: 'need my hours changed' }), 200);
    assert.deepEqual(body, { ok: true, messageId, status: 'received', confirmationEmailed: true });
    h.cleanup();
  }
});

test('10: extra key, bad messageId, oversized body and wrong content type -> 400', async () => {
  const { h } = setup();
  const id = crypto.randomUUID();
  for (const body of [{ token: VALID, messageId: id, body: 'x', extra: 1 }, { token: VALID, messageId: 'not-a-uuid', body: 'x' }, { token: VALID, body: 'x' },
    { token: VALID, messageId: id, body: 5 }, [], 'null']) {
    assert.deepEqual(await json(await h.post(body), 400), { ok: false, error: 'invalid_input' });
  }
  assert.deepEqual(await json(await h.post(null, { raw: JSON.stringify({ token: VALID, messageId: id, body: 'x'.repeat(16_400) }) }), 400), { ok: false, error: 'invalid_input' });
  assert.deepEqual(await json(await h.post(null, { raw: '{broken' }), 400), { ok: false, error: 'invalid_input' });
  const plain = new Request(URL_, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ token: VALID, messageId: id, body: 'x' }) });
  assert.deepEqual(await json(await h.route.POST(plain), 400), { ok: false, error: 'invalid_input' });
  assert.deepEqual(await json(await h.post({ token: VALID, messageId: id, body: 'x'.repeat(2001) }), 400), { ok: false, error: 'too_long' });
  assert.deepEqual(await json(await h.post({ token: VALID, messageId: id, body: 'a\u202eb' }), 400), { ok: false, error: 'invalid_input' });
  assert.equal(h.rows().length, 0);
  h.cleanup();
});

test('11: sixth message in 10 minutes for one subscription -> 429; twenty-first in 24 hours -> 429', async () => {
  const { h } = setup();
  for (let i = 0; i < 5; i++) await json(await h.post({ token: VALID, messageId: crypto.randomUUID(), body: `m${i}` }, { ip: `10.1.0.${i}` }), 200);
  assert.deepEqual(await json(await h.post({ token: VALID, messageId: crypto.randomUUID(), body: 'm5' }, { ip: '10.1.0.9' }), 429), { ok: false, error: 'rate_limited' });
  h.cleanup();

  const { h: day, subscriptionId } = setup();
  const base = Date.now() - 20 * 3_600_000;
  for (let i = 0; i < 20; i++) day.store.createClientMessage({ id: crypto.randomUUID(), subscriptionId, body: `old ${i}`, now: new Date(base + i * 60_000) });
  assert.deepEqual(await json(await day.post({ token: VALID, messageId: crypto.randomUUID(), body: 'one more' }), 429), { ok: false, error: 'rate_limited' });
  assert.equal(day.rows().length, 20);
  day.cleanup();
});

test('12: first POST sends one staff alert and one confirmation; a replay returns 200 and sends none', async () => {
  const email = mockEmail();
  const { h } = setup({}, { email });
  const messageId = crypto.randomUUID();
  const msg = { token: VALID, messageId, body: 'Please add  a service\n\nThanks (WAO)' };
  assert.deepEqual(await json(await h.post(msg), 200), { ok: true, messageId, status: 'received', confirmationEmailed: true });
  assert.deepEqual([email.calls.alert.length, email.calls.confirmation.length], [1, 1]);
  const [row] = h.rows();
  assert.equal(row.body, msg.body);
  assert.ok(row.staff_alerted_at && row.client_confirmed_at);
  assert.deepEqual(await json(await h.post({ ...msg, messageId: messageId.toUpperCase() }), 200), { ok: true, messageId, status: 'received', confirmationEmailed: true });
  assert.deepEqual([email.calls.alert.length, email.calls.confirmation.length], [1, 1], 'replay sends nothing');
  assert.equal(h.rows().length, 1);
  assert.deepEqual(await json(await h.post({ ...msg, body: 'different text' }), 409), { ok: false, error: 'conflict' });
  assert.ok(h.logs.lines.every((line) => !line.includes('Please add') && !line.includes('different text')), 'no message content in logs');
  h.cleanup();
});

test('13: a throwing email sender still yields 200 and leaves staff_alerted_at null', async () => {
  const email = mockEmail({ alert: 'throw', confirmation: 'throw' });
  const { h } = setup({}, { email });
  const messageId = crypto.randomUUID();
  assert.deepEqual(await json(await h.post({ token: VALID, messageId, body: 'secret text 123' }), 200), { ok: true, messageId, status: 'received', confirmationEmailed: false });
  const [row] = h.rows();
  assert.equal(row.staff_alerted_at, null);
  assert.equal(row.client_confirmed_at, null);
  assert.ok(h.logs.lines.some((l) => l.includes(messageId)), 'failure logged by id');
  assert.ok(h.logs.lines.every((l) => !l.includes('secret text')), 'never the content');
  h.cleanup();
});

test('14: when the confirmation is not sent (copy placeholders), confirmationEmailed is false', async () => {
  const email = mockEmail({ confirmation: 'false' });
  const { h } = setup({}, { email });
  const messageId = crypto.randomUUID();
  assert.deepEqual(await json(await h.post({ token: VALID, messageId, body: 'hi' }), 200), { ok: true, messageId, status: 'received', confirmationEmailed: false });
  assert.equal(email.calls.alert.length, 1);
  h.cleanup();
});

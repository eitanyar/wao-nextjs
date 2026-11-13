// Cancel route + Site-Bot support-queue hook (spec acceptance 20). Real store on a temp DB, mocked staff alert.
import assert from 'node:assert/strict';
import test from 'node:test';
import { jsonRequest, load, makeStore, mockEmail, recordingConsole } from '../../site-bot/client-message/clientMessage.testkit.mjs';

const EFFECTIVE = '2027-01-06T08:00:00.000Z';

function harness({ enabled = 'true', plan = 'site-bot', alert = 'ok', getThrows = false, outcome } = {}) {
  const s = makeStore();
  const subscriptionId = s.addSubscription({ plan });
  const email = mockEmail({ alert });
  const logs = recordingConsole();
  const result = outcome ?? { ok: true, subscriptionId, cancelAtPeriodEnd: true, effectiveAt: EFFECTIVE };
  const route = load('src/app/api/subscriptions/cancel/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/payments/subscriptions': {
      cancelSubscriptionByToken: async () => result,
      getSubscriptionById: (id) => { if (getThrows) throw new Error('db down'); return s.getSubscriptionById(id); },
    },
    '@/lib/payments/plans': { SITE_BOT_PLAN: { id: 'site-bot' } },
    '@/lib/site-bot/clientMessages': s.store,
    '@/lib/site-bot/clientMessageEmail': email.module,
  }, { env: enabled ? { SITE_BOT_CLIENT_MESSAGES_ENABLED: enabled } : {}, console: logs.console });
  const cancel = () => route.POST(jsonRequest('http://localhost/api/subscriptions/cancel', { token: 'f'.repeat(64) }));
  return { ...s, subscriptionId, email, logs, cancel };
}

const expected = (subscriptionId) => ({ success: true, subscriptionId, cancelAtPeriodEnd: true, effectiveAt: EFFECTIVE });

test('20: flag on + Site-Bot plan -> one cancel_notice_due item and one staff alert; response unchanged', async () => {
  const h = harness();
  const response = await h.cancel();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), expected(h.subscriptionId));
  const rows = h.rows();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'cancel_notice_due');
  assert.deepEqual(JSON.parse(rows[0].meta_json), { effectiveAt: EFFECTIVE, siteOfflineAt: '2027-02-05T08:00:00.000Z', cancelAtPeriodEnd: true });
  assert.ok(rows[0].staff_alerted_at);
  assert.equal(h.email.calls.alert.length, 1);
  await h.cancel();
  assert.equal(h.rows().length, 1, 'a repeated cancel adds no second item');
  assert.equal(h.email.calls.alert.length, 1, 'and no second alert');
  h.cleanup();
});

test('20: flag off -> no item and no alert, same response', async () => {
  const h = harness({ enabled: '' });
  const response = await h.cancel();
  assert.deepEqual(await response.json(), expected(h.subscriptionId));
  assert.equal(h.rows().length, 0);
  assert.equal(h.email.calls.alert.length, 0);
  h.cleanup();
});

test('20: non-Site-Bot plan -> nothing queued', async () => {
  const h = harness({ plan: null });
  assert.deepEqual(await (await h.cancel()).json(), expected(h.subscriptionId));
  assert.equal(h.rows().length, 0);
  h.cleanup();
});

test('20: a throwing hook or a throwing alert leaves the cancel response unchanged', async () => {
  for (const opts of [{ getThrows: true }, { alert: 'throw' }]) {
    const h = harness(opts);
    const response = await h.cancel();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), expected(h.subscriptionId));
    assert.ok(h.logs.lines.some((l) => l.includes(h.subscriptionId)), 'logged by id');
    h.cleanup();
  }
});

test('a failed cancel never touches the queue', async () => {
  const h = harness({ outcome: { ok: false, reason: 'invalid_token' } });
  const response = await h.cancel();
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { success: false, error: 'invalid_token' });
  assert.equal(h.rows().length, 0);
  h.cleanup();
});


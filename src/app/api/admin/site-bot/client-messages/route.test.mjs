// Staff queue routes for Site-Bot client messages (spec acceptance 15-16). Real guards, real store on a temp DB.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { jsonRequest, load, loadGuards, makeStore } from '../../../site-bot/client-message/clientMessage.testkit.mjs';

const UPDATE_URL = 'http://localhost/api/admin/site-bot/client-messages/update';

function routes({ admin = true, enabled = 'true' } = {}) {
  const s = makeStore();
  const imports = {
    '@/lib/site-bot/adminRequestGuards': loadGuards({ admin }),
    '@/lib/site-bot/clientMessages': s.store,
    '@/lib/site-bot/helpRequest': s.help,
  };
  const env = enabled ? { SITE_BOT_CLIENT_MESSAGES_ENABLED: enabled } : {};
  const list = load('src/app/api/admin/site-bot/client-messages/route.ts', imports, { env });
  const update = load('src/app/api/admin/site-bot/client-messages/update/route.ts', imports, { env });
  return { ...s, list, update };
}

const sameOrigin = { origin: 'http://localhost', host: 'localhost', 'sec-fetch-site': 'same-origin' };
async function json(response, status) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  return response.json();
}

test('15: no admin cookie -> 401 on both routes; update without a same-origin Origin -> 403', async () => {
  const r = routes({ admin: false });
  assert.deepEqual(await json(await r.list.GET(), 401), { ok: false, error: 'unauthorized' });
  assert.deepEqual(await json(await r.update.POST(jsonRequest(UPDATE_URL, { id: crypto.randomUUID(), status: 'done' }, { headers: sameOrigin })), 401), { ok: false, error: 'unauthorized' });
  r.cleanup();
  const a = routes();
  for (const headers of [{}, { host: 'localhost' }, { origin: 'http://evil.example', host: 'localhost' }, { ...sameOrigin, 'sec-fetch-site': 'cross-site' }]) {
    assert.deepEqual(await json(await a.update.POST(jsonRequest(UPDATE_URL, { id: crypto.randomUUID(), status: 'done' }, { headers })), 403), { ok: false, error: 'forbidden' });
  }
  for (const method of ['POST', 'PUT', 'DELETE']) assert.equal(a.list[method], undefined);
  a.cleanup();
});

test('flag off -> 503 for an admin on both routes', async () => {
  const r = routes({ enabled: '' });
  assert.deepEqual(await json(await r.list.GET(), 503), { ok: false, error: 'disabled' });
  assert.deepEqual(await json(await r.update.POST(jsonRequest(UPDATE_URL, { id: crypto.randomUUID(), status: 'done' }, { headers: sameOrigin })), 503), { ok: false, error: 'disabled' });
  r.cleanup();
});

test('16: list omits triage_json; update changes status, category and note; bad input 400; unknown id 404', async () => {
  const r = routes();
  const sub = r.addSubscription();
  const { row } = r.store.createClientMessage({ id: crypto.randomUUID(), subscriptionId: sub, body: 'line one\nline two', now: new Date() });
  const listed = await json(await r.list.GET(), 200);
  assert.equal(listed.ok, true);
  assert.equal(listed.messages.length, 1);
  assert.equal('triage_json' in listed.messages[0], false);
  assert.equal(listed.messages[0].body, 'line one\nline two');

  const post = (body) => r.update.POST(jsonRequest(UPDATE_URL, body, { headers: sameOrigin }));
  const saved = await json(await post({ id: row.id, status: 'handling', staffCategory: 'change', staffNote: 'phone number' }), 200);
  assert.deepEqual([saved.status, saved.staffCategory, saved.staffNote], ['handling', 'change', 'phone number']);
  assert.equal((await json(await post({ id: row.id, status: 'done' }), 200)).status, 'done');
  const after = (await json(await r.list.GET(), 200)).messages[0];
  assert.deepEqual([after.status, after.staff_category, after.staff_note], ['done', 'change', 'phone number']);

  for (const body of [{ id: row.id }, { id: row.id, status: 'closed' }, { id: row.id, staffCategory: 'urgent' }, { id: row.id, staffNote: 'x'.repeat(1001) },
    { id: 'nope', status: 'done' }, { id: row.id, status: 'done', extra: 1 }]) {
    assert.deepEqual(await json(await post(body), 400), { ok: false, error: 'invalid_input' });
  }
  assert.deepEqual(await json(await r.update.POST(jsonRequest(UPDATE_URL, null, { headers: sameOrigin, raw: JSON.stringify({ id: row.id, staffNote: 'x'.repeat(5000) }) })), 400), { ok: false, error: 'invalid_input' });
  assert.deepEqual(await json(await post({ id: crypto.randomUUID(), status: 'done' }), 404), { ok: false, error: 'not_found' });
  r.cleanup();
});

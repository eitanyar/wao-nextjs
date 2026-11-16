// Staff AI draft route (readiness step 5): admin-only, same-origin, flag-gated; generate / save / approve; never sends.
// Real guards and real client-message store on a temp DB; the draft module is mocked (its logic is unit-tested in
// src/lib/site-bot/supportDraft.test.ts).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { jsonRequest, load, loadGuards, makeStore, recordingConsole } from '../../../../site-bot/client-message/clientMessage.testkit.mjs';

const URL_ = 'http://localhost/api/admin/site-bot/client-messages/drafts';
const sameOrigin = { origin: 'http://localhost', host: 'localhost', 'sec-fetch-site': 'same-origin' };

function harness({ admin = true, enabled = 'true' } = {}) {
  const s = makeStore();
  const calls = [];
  const logs = recordingConsole();
  const draftRow = (id, status = 'ready', draft = 'DRAFT') => ({ message_id: id, status, draft, escalate: 0, escalate_reason: null, provider: 'gemini',
    facts_version: 'v', error_code: null, generated_at: null, edited_at: null, approved_at: status === 'approved' ? new Date().toISOString() : null, updated_at: new Date().toISOString() });
  const drafts = {
    DRAFT_MAX_CHARS: 4000,
    generateSupportDraft: async (row) => { calls.push(['generate', row.id]); return draftRow(row.id); },
    listSupportDrafts: (ids) => ids.map((id) => draftRow(id)),
    saveSupportDraftEdit: (id, text) => { calls.push(['save', id, text]); return text === 'bad' ? 'invalid_input' : draftRow(id, 'ready', text); },
    approveSupportDraft: (id, text) => { calls.push(['approve', id, text]); return text === 'twice' ? 'already_approved' : draftRow(id, 'approved', text); },
  };
  const route = load('src/app/api/admin/site-bot/client-messages/drafts/route.ts', {
    '@/lib/site-bot/adminRequestGuards': loadGuards({ admin }),
    '@/lib/site-bot/clientMessages': s.store,
    '@/lib/site-bot/helpRequest': s.help,
    '@/lib/site-bot/supportDraft': drafts,
  }, { env: enabled ? { SITE_BOT_CLIENT_MESSAGES_ENABLED: enabled } : {}, console: logs.console });
  const subscriptionId = s.addSubscription();
  const message = s.store.createClientMessage({ id: crypto.randomUUID(), subscriptionId, body: 'PRIVATE BODY', now: new Date() }).row;
  const post = (body, headers = sameOrigin) => route.POST(jsonRequest(URL_, body, { headers }));
  return { ...s, route, post, calls, message, logs };
}

test('auth, origin and flag guards', async () => {
  const denied = harness({ admin: false });
  assert.equal((await denied.route.GET()).status, 401);
  assert.equal((await denied.post({ id: denied.message.id, action: 'generate' })).status, 401);
  denied.cleanup();
  const h = harness();
  assert.equal((await h.post({ id: h.message.id, action: 'generate' }, {})).status, 403);
  h.cleanup();
  const off = harness({ enabled: '' });
  assert.equal((await off.route.GET()).status, 503);
  assert.equal((await off.post({ id: off.message.id, action: 'generate' })).status, 503);
  assert.deepEqual(off.calls, []);
  off.cleanup();
});

test('GET lists drafts for the queue; POST generate / save / approve map results; bad input is rejected', async () => {
  const h = harness();
  const list = await (await h.route.GET()).json();
  assert.equal(list.ok, true);
  assert.deepEqual(list.drafts.map((d) => d.messageId), [h.message.id]);
  assert.equal((await h.post({ id: h.message.id, action: 'generate' })).status, 200);
  const saved = await (await h.post({ id: h.message.id, action: 'save', text: 'EDIT' })).json();
  assert.equal(saved.draft.draft, 'EDIT');
  assert.equal((await h.post({ id: h.message.id, action: 'save', text: 'bad' })).status, 400);
  const approved = await (await h.post({ id: h.message.id, action: 'approve', text: 'FINAL' })).json();
  assert.equal(approved.draft.status, 'approved');
  assert.equal((await h.post({ id: h.message.id, action: 'approve', text: 'twice' })).status, 409);
  assert.equal((await h.post({ id: h.message.id, action: 'send' })).status, 400, 'there is no send action');
  assert.equal((await h.post({ id: h.message.id, action: 'generate', extra: 1 })).status, 400);
  assert.equal((await h.post({ id: crypto.randomUUID(), action: 'generate' })).status, 404);
  assert.deepEqual(h.calls.map((c) => c[0]), ['generate', 'save', 'save', 'approve', 'approve']);
  assert.ok(h.logs.lines.every((line) => !line.includes('PRIVATE BODY') && !line.includes('FINAL')));
  h.cleanup();
});

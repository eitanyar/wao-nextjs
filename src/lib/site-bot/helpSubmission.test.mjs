import assert from 'node:assert/strict';
import test from 'node:test';
import { createHelpSubmission, helpAttemptKey } from './helpSubmission.mjs';

const identity = { auditId: '123e4567-e89b-42d3-a456-426614174000', placeId: 'synthetic-place' };
const id = '123e4567-e89b-42d3-a456-426614174001';
const contact = { name: 'Synthetic Contact', phone: '0500000000', email: '', privacyAccepted: true };
const response = (body, status = 200) => ({ status, ok: status === 200, json: async () => body });

test('consented confirmed identity sends only the accepted fields and validates a durable receipt', async () => {
  const calls = [], states = [];
  const form = createHelpSubmission({
    fetchFn: async (url, options) => { calls.push({ url, options }); return response({ ok: true, requestId: id, status: 'received' }); },
    makeId: () => id, onState: value => states.push(value), isCurrent: () => true,
  });
  await form.submit(identity, contact);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/site-bot/help-request');
  assert.deepEqual(JSON.parse(calls[0].options.body), { requestId: id, auditId: identity.auditId, placeId: identity.placeId,
    name: contact.name, phone: contact.phone, privacyAccepted: true });
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.equal(states.at(-1), 'received');
  form.dispose();
});

test('declined consent and empty contact never transmit', async () => {
  let calls = 0;
  const form = createHelpSubmission({ fetchFn: () => { calls++; throw Error('unexpected'); }, makeId: () => id,
    onState: () => {}, isCurrent: () => true });
  await form.submit(identity, { ...contact, privacyAccepted: false });
  await form.submit(identity, { ...contact, phone: '', email: '' });
  assert.equal(calls, 0);
  form.dispose();
});

test('uncertain response preserves the same request ID for explicit retry and rejects mismatched receipts', async () => {
  const ids = [], states = [];
  let attempt = 0;
  const form = createHelpSubmission({ fetchFn: async (_url, options) => {
    ids.push(JSON.parse(options.body).requestId);
    attempt++;
    if (attempt === 1) throw Error('timeout after storage may have happened');
    if (attempt === 2) return response({ ok: true, requestId: '123e4567-e89b-42d3-a456-426614174099', status: 'received' });
    return response({ ok: true, requestId: id, status: 'received' });
  }, makeId: () => id, onState: value => states.push(value), isCurrent: () => true });
  await form.submit(identity, contact); assert.equal(states.at(-1), 'unconfirmed');
  await form.submit(identity, contact); assert.equal(states.at(-1), 'unconfirmed');
  await form.submit(identity, contact); assert.equal(states.at(-1), 'received');
  assert.deepEqual(ids, [id, id, id]);
  form.dispose();
});

test('uncertain attempt cannot be rewritten, and explicit reload retry reuses its original ID', async () => {
  const saved = new Map(), calls = [], states = [];
  const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const deps = { fetchFn: async (_url, options) => { calls.push(JSON.parse(options.body)); throw Error('lost receipt'); },
    makeId: () => id, onState: value => states.push(value), isCurrent: () => true, storage };
  const form = createHelpSubmission(deps);
  await form.submit(identity, contact);
  await form.submit(identity, { ...contact, phone: '0500000001' });
  assert.equal(calls.length, 1);
  assert.equal(states.at(-1), 'unconfirmed');
  form.dispose();
  const reloaded = createHelpSubmission({ ...deps, makeId: () => { throw Error('must not create another ID'); } });
  await reloaded.submit(identity, contact);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].requestId, calls[0].requestId);
  assert.equal(states.at(-1), 'unconfirmed');
  reloaded.dispose();
});

test('identity changes or disposal suppress late success without a second request', async () => {
  let complete, current = true;
  const states = [];
  const form = createHelpSubmission({ fetchFn: () => new Promise(resolve => { complete = resolve; }), makeId: () => id,
    onState: value => states.push(value), isCurrent: () => current });
  const pending = form.submit(identity, contact);
  current = false;
  complete(response({ ok: true, requestId: id, status: 'received' }));
  await pending;
  assert.notEqual(states.at(-1), 'received');
  form.dispose();
});

test('a conflicting reload retry permits correcting contact and reuses the same ID', async () => {
  const saved = new Map(), calls = [], states = [];
  const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const deps = { storage, makeId: () => id, isCurrent: () => true, onState: value => states.push(value),
    fetchFn: async (_url, options) => { calls.push(JSON.parse(options.body)); return response({}, 409); } };
  const original = createHelpSubmission(deps);
  await original.submit(identity, contact);
  original.dispose();
  const restored = createHelpSubmission(deps);
  await restored.submit(identity, { ...contact, phone: '0500000001' });
  assert.equal(states.at(-1), 'retry');
  await restored.submit(identity, contact);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].requestId, id);
  assert.equal(calls[2].phone, contact.phone);
  restored.dispose();
});


test('not-found retry permits correcting contact while preserving pending ID', async () => {
  const calls = [], states = [];
  const form = createHelpSubmission({makeId: () => id, isCurrent: () => true, onState: state => states.push(state),
    fetchFn: async (_, options) => { calls.push(JSON.parse(options.body)); return calls.length === 1 ? response({},404) : response({ok:true,requestId:id,status:'received'}); }});
  await form.submit(identity, {...contact, phone:'0500000001'});
  await form.submit(identity, contact);
  assert.equal(calls.length, 2); assert.equal(calls[1].requestId,id); assert.equal(states.at(-1),'received');
});


test('validation rejection permits correction using the original request ID', async () => {
  const calls = [], states = [];
  const form = createHelpSubmission({ makeId: () => id, isCurrent: () => true, onState: state => states.push(state),
    fetchFn: async (_, options) => {
      calls.push(JSON.parse(options.body));
      return calls.length === 1 ? response({ ok: false, error: 'invalid_input' }, 400) : response({ ok: true, requestId: id, status: 'received' });
    } });
  await form.submit(identity, { ...contact, phone: '', email: 'a@localhost' });
  assert.equal(states.at(-1), 'retry');
  await form.submit(identity, { ...contact, phone: '', email: 'a@example.invalid' });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].requestId, id);
  assert.equal(states.at(-1), 'received');
  form.dispose();
});

test('recovery requires the exact per-tab pending marker and never generates an ID', async () => {
  const values = new Map(), sent = [], states = [];
  let generated = 0;
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const form = createHelpSubmission({ storage, recoveryOnly: true, makeId: () => { generated++; return id; },
    isCurrent: () => true, onState: state => states.push(state), fetchFn: async (url, options) => {
      sent.push({ url, body: JSON.parse(options.body) });
      return response({ ok: true, requestId: id, status: 'received' });
    } });
  await form.submit(identity, contact);
  assert.equal(states.at(-1), 'blocked');
  assert.equal(sent.length, 0);
  values.set(helpAttemptKey({ ...identity, placeId: 'different' }), `pending:${id}`);
  await form.submit(identity, contact);
  assert.equal(sent.length, 0);
  values.set(helpAttemptKey(identity), `pending:${id}`);
  await form.submit(identity, contact);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, '/api/site-bot/help-request/recover');
  assert.equal(sent[0].body.requestId, id);
  assert.equal(generated, 0);
  form.dispose();
});

test('recovery uses the dedicated lookup-only endpoint', async () => {
  const identity = { auditId: 'f6a77493-4d4d-4d4d-8d4d-123456789abc', placeId: 'synthetic' };
  const id = 'a6a77493-4d4d-4d4d-8d4d-123456789abc';
  const storage = { getItem: () => `pending:${id}`, setItem: () => {} };
  let url;
  const form = createHelpSubmission({ storage, recoveryOnly: true, makeId: () => { throw new Error('must not create id'); }, isCurrent: () => true, onState: () => {}, fetchFn: async value => { url = value; return new Response(JSON.stringify({ ok: true, requestId: id, status: 'received' }), { status: 200 }); } });
  await form.submit(identity, { name: 'Synthetic', email: 'test@example.invalid', privacyAccepted: true });
  assert.equal(url, '/api/site-bot/help-request/recover');
});
